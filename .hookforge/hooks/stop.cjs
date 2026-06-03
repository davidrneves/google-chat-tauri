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
    if (!harness.features.agentStop) { process.exit(0); return; }

    // Always write audit entry (existing behavior)
    writeAudit({ ts: new Date().toISOString(), hookEvent: 'Stop', payload: sanitizePayloadPaths(payload) });

    try {
      const telemetryDir = path.join(projectRoot, '.hookforge', 'telemetry');
      if (!fs.existsSync(telemetryDir)) fs.mkdirSync(telemetryDir, { recursive: true });

      const currentSessionPath = path.join(telemetryDir, 'current-session.json');
      let sessionStartTs = null;
      try { sessionStartTs = JSON.parse(fs.readFileSync(currentSessionPath, 'utf8')).started_at || null; } catch { /* ok */ }

      let lastUsage = null;
      const transcriptPath = payload.transcript_path;
      if (transcriptPath) {
        try {
          const stat = fs.statSync(transcriptPath);
          const readSize = Math.min(8192, stat.size);
          const buf = Buffer.alloc(readSize);
          const fd = fs.openSync(transcriptPath, 'r');
          fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
          fs.closeSync(fd);
          const tail = buf.toString('utf8');
          // Extract the last "usage" object via brace-balanced, string-aware scan.
          // A naive [^}]* regex truncates at the first nested '}' because the usage
          // object now contains nested objects (server_tool_use, cache_creation,
          // iterations), producing invalid JSON and a null cost for every session.
          let probe = tail.length;
          while (probe >= 0) {
            const keyIdx = tail.lastIndexOf('"usage"', probe);
            if (keyIdx === -1) break;
            const open = tail.indexOf('{', keyIdx + 7);
            if (open === -1) { probe = keyIdx - 1; continue; }
            let depth = 0, inStr = false, esc = false, close = -1;
            for (let i = open; i < tail.length; i++) {
              const ch = tail[i];
              if (esc) { esc = false; continue; }
              if (ch === '\\') { esc = true; continue; }
              if (ch === '"') { inStr = !inStr; continue; }
              if (inStr) continue;
              if (ch === '{') depth++;
              else if (ch === '}' && --depth === 0) { close = i; break; }
            }
            if (close !== -1) {
              try { lastUsage = JSON.parse(tail.slice(open, close + 1)); } catch { lastUsage = null; }
              if (lastUsage) break;
            }
            probe = keyIdx - 1;
          }
        } catch { /* transcript unreadable */ }
      }

      let estimatedCost = null;
      if (lastUsage) {
        estimatedCost = (
          (lastUsage.input_tokens || 0) * 3 +
          (lastUsage.cache_creation_input_tokens || 0) * 3.75 +
          (lastUsage.cache_read_input_tokens || 0) * 0.30 +
          (lastUsage.output_tokens || 0) * 15
        ) / 1_000_000;
      }

      const nowTs = new Date().toISOString();
      let durationMs = null;
      if (sessionStartTs) { try { durationMs = new Date(nowTs) - new Date(sessionStartTs); } catch { /* ok */ } }

      const costPath = path.join(telemetryDir, 'session-costs.jsonl');
      const MAX_COST_BYTES = 2 * 1024 * 1024;
      try { if (fs.statSync(costPath).size >= MAX_COST_BYTES) fs.renameSync(costPath, costPath + '.1'); } catch { /* ok */ }
      fs.appendFileSync(costPath, JSON.stringify({
        session_id: payload.session_id || 'unknown',
        ts: nowTs,
        started_at: sessionStartTs,
        duration_ms: durationMs,
        last_usage: lastUsage,
        estimated_cost: estimatedCost,
        note: 'estimated_cost from last api call only',
      }) + '\n');

      try { fs.unlinkSync(currentSessionPath); } catch { /* ok */ }

      const statePath = path.join(projectRoot, '.hookforge', 'state.json');
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        state.sessionCount = (state.sessionCount || 0) + 1;
        state.lastSession = nowTs;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      } catch { /* ok */ }
    } catch { /* never block on telemetry failure */ }

    if (!harness.features.stopQualityGate) { process.exit(0); return; }

    const runtime = (harness.runtime) || 'claude-code';
    const sessionStart = Date.now();
    const cmds = detectCommands(projectRoot, harness);

    function runCheck(cmd, timeout) {
      if (!cmd) return null;
      const t0 = Date.now();
      const result = spawnSync(cmd, {
        shell: true,
        timeout: timeout,
        encoding: 'utf8',
        cwd: projectRoot,
      });
      const durationMs = Date.now() - t0;
      const combined = (result.stdout || '') + (result.stderr || '');
      const exitCode = result.status !== null ? result.status : -1;
      const errorCount = exitCode === 0 && result.error == null ? 0 : countErrors(combined, cmd) || (exitCode !== 0 ? -1 : 0);
      return {
        command: cmd,
        exitCode,
        errorCount,
        durationMs,
        output: combined.length > 2000 ? combined.slice(0, 2000) + '... (truncated)' : combined,
      };
    }

    const stopTimeout = (harness.stopTimeout || 14000);
    const typecheckResult = runCheck(cmds.typecheck, Math.min(8000, stopTimeout));
    const elapsed = Date.now() - sessionStart;
    const lintBudget = Math.max(0, stopTimeout - elapsed);
    const lintResult = lintBudget > 0 ? runCheck(cmds.lint, lintBudget) : null;

    const totalDurationMs = Date.now() - sessionStart;
    const typecheckPassed = !typecheckResult || (typecheckResult.exitCode === 0 && typecheckResult.errorCount === 0);
    const lintPassed = !lintResult || (lintResult.exitCode === 0 && lintResult.errorCount === 0);
    const passed = typecheckPassed && lintPassed;

    // Append session summary to audit.jsonl
    writeAudit({
      ts: new Date().toISOString(),
      hookEvent: 'Stop',
      type: 'session-summary',
      payload: {
        stopReason: (payload.stop_reason) || null,
        typecheck: typecheckResult,
        lint: lintResult,
        passed,
        totalDurationMs,
      },
    });

    if (!passed) {
      const parts = [];
      if (!typecheckPassed && typecheckResult) {
        parts.push('typecheck ' + (typecheckResult.errorCount > 0 ? typecheckResult.errorCount + ' errors' : 'failed'));
      }
      if (!lintPassed && lintResult) {
        parts.push('lint ' + (lintResult.errorCount > 0 ? lintResult.errorCount + ' errors' : 'failed'));
      }
      writeFeedback('[hookforge] stop gate: ' + (parts.join(', ') || 'checks failed'), runtime);
    } else {
      const parts = [];
      if (typecheckResult) parts.push('typecheck ok');
      if (lintResult) parts.push('lint ok');
      writeFeedback('[hookforge] stop gate: ' + (parts.join(', ') || 'ok'), runtime);
    }
    writeCBState('Stop', { failures: 0 });
  } catch {
    // Never block due to hook failure
    try {
      var cbS = readCBState('Stop');
      cbS.failures = (cbS.failures || 0) + 1;
      writeCBState('Stop', cbS);
      if (cbS.failures >= 3) {
        writeAudit({ ts: new Date().toISOString(), hookEvent: 'Stop', type: 'circuit-breaker-tripped', payload: { failures: cbS.failures, message: 'Hook crashed ' + cbS.failures + ' times. Run hookforge repair.' } });
      }
    } catch {}
  }
  process.exit(0);
});
