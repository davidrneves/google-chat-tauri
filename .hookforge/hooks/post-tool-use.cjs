#!/usr/bin/env node
'use strict';

// ----- hookforge inline helpers -----
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// projectRoot: .hookforge/hooks/ -> .hookforge/ -> project root
const projectRoot = path.resolve(__dirname, '..', '..');
const harnessPath = path.join(projectRoot, '.claude', 'harness.json');
const auditPath = path.join(projectRoot, '.hookforge', 'audit.jsonl');
const detectedCachePath = path.join(projectRoot, '.hookforge', 'detected-commands.json');

function readHarness() {
  try {
    return JSON.parse(fs.readFileSync(harnessPath, 'utf8'));
  } catch {
    return { features: {} };
  }
}

function writeAudit(entry) {
  try {
    var MAX_AUDIT_BYTES = 5 * 1024 * 1024;
    try {
      if (fs.statSync(auditPath).size >= MAX_AUDIT_BYTES) {
        fs.renameSync(auditPath, auditPath + '.1');
      }
    } catch { /* file may not exist yet */ }
    fs.appendFileSync(auditPath, JSON.stringify(entry) + '\n');
  } catch {
    // never block on audit failure
  }
}

function sanitizePayloadPaths(payload) {
  try {
    if (!payload || typeof payload !== 'object') return payload;
    var out = Object.assign({}, payload);
    var ti = out.tool_input;
    if (ti && typeof ti === 'object') {
      var fp = ti.file_path;
      if (typeof fp === 'string' && path.isAbsolute(fp)) {
        var rel = path.relative(projectRoot, fp);
        if (!rel.startsWith('..')) {
          out.tool_input = Object.assign({}, ti, { file_path: rel });
        }
      }
    }
    if (typeof out.cwd === 'string' && path.isAbsolute(out.cwd)) {
      var cwdRel = path.relative(projectRoot, out.cwd);
      if (!cwdRel.startsWith('..')) {
        out.cwd = cwdRel || '.';
      }
    }
    delete out.transcript_path;
    return out;
  } catch { /* never block */ }
  return payload;
}

function runtimeSupportsFeedback(runtime) {
  return ["claude-code","kiro"].includes(runtime);
}

function writeFeedback(message, runtime) {
  try {
    if (runtimeSupportsFeedback(runtime)) {
      process.stdout.write(JSON.stringify({ type: 'output', output: message }) + '\n');
    }
  } catch {
    // never block on feedback failure
  }
}

function sha256File(filePath) {
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(contents).digest('hex');
  } catch {
    return null;
  }
}

function detectCommands(projectRoot, harness) {
  try {
    // Check for explicit override in harness.json
    const typecheckOverride = harness && harness.typecheck && harness.typecheck.command;

    // Find package.json walking up from projectRoot
    let pkgPath = null;
    let dir = projectRoot;
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, 'package.json');
      if (fs.existsSync(candidate)) { pkgPath = candidate; break; }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    const currentHash = pkgPath ? sha256File(pkgPath) : null;

    // Read cache
    let cache = null;
    try {
      cache = JSON.parse(fs.readFileSync(detectedCachePath, 'utf8'));
    } catch { /* no cache */ }

    // Use cache if hash matches and no override
    if (!typecheckOverride && cache && cache.packageJsonHash && cache.packageJsonHash === currentHash) {
      return { typecheck: cache.typecheck, lint: cache.lint, test: null };
    }

    // Detect from package.json
    let pkg = {};
    if (pkgPath) {
      try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { /* ignore */ }
    }
    const scripts = pkg.scripts || {};
    const devDeps = pkg.devDependencies || {};
    const pm = (harness && harness.packageManager) || 'npm';
    const runPrefix = pm === 'bun' ? 'bun run' : pm === 'yarn' ? 'yarn run' : 'npm run';

    // Typecheck resolution
    let typecheck = null;
    if (typecheckOverride) {
      typecheck = typecheckOverride;
    } else if (scripts.typecheck) {
      typecheck = runPrefix + ' typecheck';
    } else if (scripts['type-check']) {
      typecheck = runPrefix + ' type-check';
    } else if (scripts.tsc) {
      typecheck = runPrefix + ' tsc';
    } else if (scripts.build && typeof scripts.build === 'string' && scripts.build.includes('tsc')) {
      typecheck = runPrefix + ' build';
    } else if (devDeps.typescript) {
      typecheck = pm === 'bun' ? 'bunx tsc --noEmit' : 'npx tsc --noEmit';
    }

    // Lint resolution
    let lint = null;
    if (scripts.lint) {
      lint = runPrefix + ' lint';
    } else if (scripts['lint:check']) {
      lint = runPrefix + ' lint:check';
    } else if (scripts.check) {
      lint = runPrefix + ' check';
    } else if (devDeps.eslint) {
      lint = pm === 'bun' ? 'bunx eslint .' : 'npx eslint .';
    } else if (devDeps['@biomejs/biome']) {
      lint = pm === 'bun' ? 'bunx biome check .' : 'npx biome check .';
    }

    const result = { typecheck, lint, test: null, detectedAt: new Date().toISOString(), packageJsonHash: currentHash };

    // Write updated cache
    try {
      const hfDir = path.join(projectRoot, '.hookforge');
      if (!fs.existsSync(hfDir)) fs.mkdirSync(hfDir, { recursive: true });
      fs.writeFileSync(detectedCachePath, JSON.stringify(result, null, 2));
    } catch { /* ignore cache write failure */ }

    return { typecheck, lint, test: null };
  } catch {
    return { typecheck: null, lint: null, test: null };
  }
}

function countErrors(output, command) {
  if (!output) return 0;
  if (command && (command.includes('tsc') || command.includes('typecheck'))) {
    return (output.match(/error TS\d+/g) || []).length;
  }
  // eslint / biome style: lines starting with error
  return (output.match(/^\s*error/gm) || []).length;
}

// Circuit-breaker state: tracks consecutive hook crashes in .hookforge/cb-state.json
function readCBState(hookName) {
  try {
    var cbPath = path.join(projectRoot, '.hookforge', 'cb-state.json');
    var s = JSON.parse(fs.readFileSync(cbPath, 'utf8'));
    return (s && typeof s === 'object' && s[hookName]) ? s[hookName] : { failures: 0 };
  } catch { return { failures: 0 }; }
}
function writeCBState(hookName, state) {
  try {
    var cbPath = path.join(projectRoot, '.hookforge', 'cb-state.json');
    var all = {};
    try { all = JSON.parse(fs.readFileSync(cbPath, 'utf8')); } catch {}
    all[hookName] = state;
    fs.writeFileSync(cbPath, JSON.stringify(all));
  } catch {}
}
// ----- end helpers -----

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = raw ? JSON.parse(raw) : {};
    const harness = readHarness();
    if (!harness.features.toolPostUse) { process.exit(0); return; }

    // Always write audit entry (existing behavior)
    writeAudit({ ts: new Date().toISOString(), hookEvent: 'PostToolUse', payload: sanitizePayloadPaths(payload) });

    try {
      const durationMs = payload.duration_ms;
      if (typeof durationMs === 'number') {
        const telemetryDir = path.join(projectRoot, '.hookforge', 'telemetry');
        if (!fs.existsSync(telemetryDir)) fs.mkdirSync(telemetryDir, { recursive: true });
        const timingPath = path.join(telemetryDir, 'hook-timing.jsonl');
        const MAX_TIMING_BYTES = 1 * 1024 * 1024;
        try { if (fs.statSync(timingPath).size >= MAX_TIMING_BYTES) fs.renameSync(timingPath, timingPath + '.1'); } catch { /* ok */ }
        fs.appendFileSync(timingPath, JSON.stringify({
          ts: new Date().toISOString(),
          session_id: payload.session_id || 'unknown',
          hook: 'PostToolUse',
          tool_name: payload.tool_name || 'unknown',
          duration_ms: durationMs,
        }) + '\n');
      }
    } catch { /* never block */ }

    if (harness.features.inferentialSensor) {
      try {
        const toolName = String(payload.tool_name || '');
        const toolInput = typeof payload.tool_input === 'object' && payload.tool_input !== null
          ? payload.tool_input : {};
        const rawFilePath = String(toolInput.file_path || '');
        const filePath = (rawFilePath && path.isAbsolute(rawFilePath))
          ? (function() { var r = path.relative(projectRoot, rawFilePath); return r.startsWith('..') ? rawFilePath : r; })()
          : rawFilePath;
        const command = String(toolInput.command || '');
        const statePath = path.join(projectRoot, '.hookforge', 'sensor-state.json');
        let sensorState = { history: [] };
        try { sensorState = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* start fresh */ }
        const history = Array.isArray(sensorState.history) ? sensorState.history : [];
        const signals = [];
        const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
        const VERIFY_RE = /\b(tsc|bun\s+test|vitest|jest|eslint|biome)\b/;
        if (WRITE_TOOLS.has(toolName) && filePath) {
          const hadRead = history.some(r => r.tool === 'Read' && r.path === filePath);
          signals.push({ behaviorId: 'read-before-write', pass: hadRead,
            evidence: hadRead ? 'Read on ' + filePath + ' found before ' + toolName
                               : 'No prior Read on ' + filePath + ' before ' + toolName });
        }
        if (toolName === 'Write' && filePath) {
          const hadRead = history.some(r => r.tool === 'Read' && r.path === filePath);
          signals.push({ behaviorId: 'no-blind-overwrite', pass: hadRead,
            evidence: hadRead ? 'Read on ' + filePath + ' preceded Write'
                               : 'Write on ' + filePath + ' without prior Read' });
        }
        if (WRITE_TOOLS.has(toolName)) {
          let lastWIdx = -1;
          for (let wi = history.length - 1; wi >= 0; wi--) {
            if (WRITE_TOOLS.has(history[wi].tool)) { lastWIdx = wi; break; }
          }
          if (lastWIdx >= 0) {
            const afterLast = history.slice(lastWIdx + 1);
            if (afterLast.length > 0) {
              const verified = afterLast.some(r => r.tool === 'Bash' && r.command && VERIFY_RE.test(r.command));
              signals.push({ behaviorId: 'verify-after-edit', pass: verified,
                evidence: verified ? 'Verify command found after previous edit'
                                   : 'No verify command found after previous edit' });
            }
          }
        }
        history.push({ tool: toolName, path: filePath || undefined, command: command || undefined });
        const trimmed = history.length > 50 ? history.slice(-50) : history;
        if (signals.length > 0) {
          writeAudit({ ts: new Date().toISOString(), hookEvent: 'PostToolUse',
            type: 'inference-signals', payload: { toolName, signals } });
        }
        try { fs.writeFileSync(statePath, JSON.stringify({ history: trimmed })); } catch { /* ignore */ }
      } catch { /* never block on sensor failure */ }
    }

    if (!harness.features.postToolUseQualityGate) { process.exit(0); return; }

    const cmds = detectCommands(projectRoot, harness);
    const runtime = (harness.runtime) || 'claude-code';

    if (!cmds.typecheck) {
      writeFeedback('[hookforge] typecheck: not configured', runtime);
      process.exit(0);
      return;
    }

    const hookTimeout = (harness.hookTimeout || 4000);
    const t0 = Date.now();
    const result = spawnSync(cmds.typecheck, {
      shell: true,
      timeout: hookTimeout,
      encoding: 'utf8',
      cwd: projectRoot,
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const combined = (result.stdout || '') + (result.stderr || '');

    let message;
    if (result.status === 0 && result.error == null) {
      message = '[hookforge] typecheck: ok (' + elapsed + 's)';
    } else {
      const errCount = countErrors(combined, cmds.typecheck);
      const label = errCount > 0 ? errCount + ' error' + (errCount === 1 ? '' : 's') : 'failed';
      const truncated = combined.length > 1900 ? combined.slice(0, 1900) + '\n... (truncated)' : combined;
      message = '[hookforge] typecheck: ' + label + ' (' + elapsed + 's)\n' + truncated;
    }

    // Cap total at 2000 chars
    if (message.length > 2000) message = message.slice(0, 1997) + '...';
    writeFeedback(message, runtime);
    writeCBState('PostToolUse', { failures: 0 });
  } catch {
    // Never block due to hook failure
    try {
      var cbS = readCBState('PostToolUse');
      cbS.failures = (cbS.failures || 0) + 1;
      writeCBState('PostToolUse', cbS);
      if (cbS.failures >= 3) {
        writeAudit({ ts: new Date().toISOString(), hookEvent: 'PostToolUse', type: 'circuit-breaker-tripped', payload: { failures: cbS.failures, message: 'Hook crashed ' + cbS.failures + ' times. Run hookforge repair.' } });
      }
    } catch {}
  }
  process.exit(0);
});
