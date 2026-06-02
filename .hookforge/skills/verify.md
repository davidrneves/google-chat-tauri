# Skill: verify

**Description**: Self-test the hookforge hook pipeline from within a live session. Exercises real tool calls and checks that hooks fired, telemetry accumulated, and no errors occurred. Reports HOOK HEALTH PASS or FAIL with per-hook breakdown.
**Version**: 1.0.0 | **Effort**: low

## Identity

verify confirms the hookforge hook pipeline is working correctly in the current session. It runs inside a real Claude Code session so actual tool calls trigger actual hook dispatch - no synthetic payloads.

Use when:
- Hooks were recently updated
- Something feels wrong (tools seem slow, quality-gate not firing)
- After running `hookforge init` in a new project

**Example:** `/do verify hookforge is working` → PostToolUse hook fired on Bash tool call, Stop hook fired on session end; pipeline end-to-end PASS

## When to Use

- After running `hookforge init` in a new project to confirm hooks are installed and firing
- When hooks seem slow, the quality-gate is not triggering, or telemetry looks stale
- After updating hook configuration or the runtime to confirm the pipeline still works

## Protocol

### Step 1: BASELINE

Read the current telemetry state (count lines, record sizes):

```
.hookforge/telemetry/hook-timing.jsonl   -> baseline_timing (line count)
.hookforge/audit.jsonl                   -> baseline_audit (line count)
.hookforge/telemetry/hook-errors.log     -> baseline_errors (size in bytes)
```

If `.hookforge/` doesn't exist: "HOOK HEALTH: FAIL - .hookforge/ not found. Run `hookforge init` to initialize."

### Step 2: EXERCISE HOOKS

Run these tool calls in sequence. Each exercises a different hook:

1. **Write** a temp file at `.hookforge/verify-temp.ts`:
   ```typescript
   // hookforge verify probe
   export const verifyProbe = true;
   ```
   Exercises: PreToolUse (protect-files, governance), PostToolUse (post-edit)

2. **Edit** the same file - change `true` to `false`:
   Exercises: PreToolUse (protect-files, governance), PostToolUse (post-edit)

3. **Bash** a harmless read command: `echo "verify-probe"`
   Exercises: PreToolUse (governance)

4. **Read** the temp file back:
   Exercises: PreToolUse (protect-files - should allow, it's not .env)

5. **Delete** the temp file: `rm .hookforge/verify-temp.ts`
   Cleanup

### Step 3: CHECK SIDE EFFECTS

After all tool calls complete, re-read telemetry:

| Check | Expected | -
|---|---|---|
| hook-timing.jsonl grew | +2 or more lines (Write + Edit post-hooks) | PASS/FAIL |
| audit.jsonl grew | +3 or more lines (Write + Edit + Bash pre-hooks) | PASS/FAIL |
| hook-errors.log unchanged | same size as baseline | PASS/FAIL |

### Step 4: REPORT

```
=== HOOK HEALTH CHECK ===

hook-timing.jsonl:  +N lines  [PASS / FAIL]
audit.jsonl:        +N lines  [PASS / FAIL]
hook-errors.log:    no errors [PASS / FAIL - N new errors]

HOOK HEALTH: PASS
```

Or if any check fails:

```
HOOK HEALTH: FAIL

Failing checks:
- hook-timing.jsonl did not grow: PostToolUse hooks may not be firing
  -> Verify hooks are installed: hookforge verify --hooks
  -> Check settings: cat .hookforge/harness.json | grep PostToolUse

- audit.jsonl did not grow: governance hook may not be firing
  -> Check runtime adapter is installed for your AI tool
  -> Re-run: hookforge init --runtime {runtime} --yes
```

## Edge Cases

- **No `.hookforge/telemetry/` directory**: Report FAIL immediately. Suggest `hookforge init`.
- **Hooks installed but telemetry still zero**: Check `features.telemetry` in `.hookforge/harness.json`.
- **First-time run (files don't exist yet)**: File creation during the test counts as "grew". Treat as PASS for that check.
- **Running on Kiro/Codex/Copilot**: Hook dispatch may differ from Claude Code. Note the runtime in the report.

## What This Does NOT Test

- Hook correctness on edge cases (use `hookforge test` for that)
- Full PreToolUse -> tool -> PostToolUse sequence isolation
- Skill output quality

## Quality Gates

- All 3 telemetry checks must pass: timing grew, audit grew, no new errors
- Temp file must be cleaned up regardless of pass/fail
- Report must include exact counts (+N lines), not just PASS/FAIL
- If `.hookforge/` does not exist, FAIL immediately

## Exit Protocol

```
---HANDOFF---
- Hook pipeline: PASS / FAIL
- hook-timing.jsonl: +N lines
- audit.jsonl: +N lines
- hook-errors.log: N new errors (0 expected)
- Next: if FAIL, run hookforge init --runtime {runtime} --yes for re-installation
---
```

Next skill: `commit-message` - generate a conventional commit message from the verified staged diff.