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
    if (!harness.features.sessionStart) { process.exit(0); return; }

    // Always write audit entry (existing behavior)
    writeAudit({ ts: new Date().toISOString(), hookEvent: 'SessionStart', payload: sanitizePayloadPaths(payload) });

    try {
      const telemetryDir = path.join(projectRoot, '.hookforge', 'telemetry');
      if (!fs.existsSync(telemetryDir)) fs.mkdirSync(telemetryDir, { recursive: true });
      fs.writeFileSync(
        path.join(telemetryDir, 'current-session.json'),
        JSON.stringify({ session_id: payload.session_id || 'unknown', started_at: new Date().toISOString() })
      );
    } catch { /* never block */ }

    if (!harness.features.sessionStartContext) { process.exit(0); return; }

    const runtime = (harness.runtime) || 'claude-code';

    // Read last non-session-start audit entry
    let lastEntry = null;
    try {
      const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const e = JSON.parse(lines[i]);
          if (e.hookEvent !== 'SessionStart') { lastEntry = e; break; }
        } catch { /* skip malformed */ }
      }
    } catch { /* audit file may not exist yet */ }

    // List installed skills
    let skillNames = [];
    try {
      const skillsDir = path.join(projectRoot, '.hookforge', 'skills');
      if (fs.existsSync(skillsDir)) {
        skillNames = fs.readdirSync(skillsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace(/\.md$/, ''));
      }
    } catch { /* ignore */ }

    // Refresh command detection cache
    const cmds = detectCommands(projectRoot, harness);

    // Build context message
    const version = (harness.version) || 'unknown';
    const trust = (harness.trust && harness.trust.level) || 'novice';
    const sessionCount = (harness.trust && harness.trust.sessionCount) || 0;

    let lastStopLine = 'Last stop: none (first session)';
    if (lastEntry) {
      if (lastEntry.type === 'session-summary') {
        const p = lastEntry.payload || {};
        const tcStatus = !p.typecheck ? 'typecheck ok' : (p.typecheck.exitCode === 0 ? 'typecheck ok' : 'typecheck failed');
        const lintStatus = !p.lint ? 'lint ok' : (p.lint.exitCode === 0 ? 'lint ok' : 'lint failed');
        lastStopLine = 'Last stop: ' + (lastEntry.ts || '') + ' - ' + tcStatus + ', ' + lintStatus;
      } else {
        lastStopLine = 'Last stop: ' + (lastEntry.ts || '') + ' - ' + lastEntry.hookEvent;
      }
    }

    const typecheckDisplay = cmds.typecheck || 'not configured';
    const lintDisplay = cmds.lint || 'not configured';

    let skillsLine;
    if (skillNames.length === 0) {
      skillsLine = 'Skills: none installed';
    } else {
      const maxShow = 5;
      const shown = skillNames.slice(0, maxShow).join(', ');
      const extra = skillNames.length > maxShow ? ' +' + (skillNames.length - maxShow) + ' more' : '';
      skillsLine = 'Skills (' + skillNames.length + '): ' + shown + extra;
    }

    let context = [
      '[hookforge] Session start',
      '  Trust: ' + trust + ' (' + sessionCount + ' sessions) | Runtime: ' + runtime,
      '  ' + lastStopLine,
      '  Commands: typecheck=' + typecheckDisplay + '  lint=' + lintDisplay,
      '  ' + skillsLine,
    ].join('\n');

    if (harness.features.memoryLayer) {
      const provider = (harness.memory && harness.memory.provider) || 'qmd';
      context += '\n  Memory: vault active via ' + provider + '. Use mcp__qmd__query to search.';
    }

    // Cap at 600 chars
    if (context.length > 600) context = context.slice(0, 597) + '...';

    writeFeedback(context, runtime);
    writeCBState('SessionStart', { failures: 0 });
  } catch {
    // Never block due to hook failure
    try {
      var cbS = readCBState('SessionStart');
      cbS.failures = (cbS.failures || 0) + 1;
      writeCBState('SessionStart', cbS);
      if (cbS.failures >= 3) {
        writeAudit({ ts: new Date().toISOString(), hookEvent: 'SessionStart', type: 'circuit-breaker-tripped', payload: { failures: cbS.failures, message: 'Hook crashed ' + cbS.failures + ' times. Run hookforge repair.' } });
      }
    } catch {}
  }
  process.exit(0);
});
