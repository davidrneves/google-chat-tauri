# Skill: quality-gate

**Description**: Run cold-path quality checks at session end: typecheck, test suite, lint suppressions, and hook audit.
**Version**: 1.0.0 | **Effort**: low

## Identity

quality-gate is a hookforge skill that runs the project's comprehensive quality checks at session end, providing a final verification layer before handoff. It is the cold path: expensive checks that run once per session, not on every edit.

**Example:** `/do run quality gate before merging` → lint PASS, typecheck PASS, tests 42/42; produces a signed-off checklist

## When to Use

- At the end of every coding session before committing and pushing
- Before switching tasks to leave the codebase in a clean state
- When `/do` routes "quality", "check", or "gate"

## Orientation

The quality gate catches issues the hot-path (per-edit typecheck) missed and records the session's quality baseline. It does not block session end - it reports and records. If the gate finds something the hot path missed, that is a signal to tighten the hot-path rules.

Zero-tolerance for lint suppressions introduced in this session: `@ts-ignore`, `eslint-disable`, `# noqa`.

## Protocol

1. Run typecheck: `bunx tsc --noEmit` (or project equivalent). Record the error count.
2. Run the test suite if configured. Record pass count, fail count, and any new failures.
3. Scan for lint suppressions introduced this session: `git diff HEAD~1 -- | grep -E '@ts-ignore|eslint-disable|# noqa|// nolint'`. Report any found - zero tolerance.
4. Scan for TODO/FIXME comments added this session: `git diff HEAD~1 -- | grep -E '^\+.*TODO|^\+.*FIXME'`. Report any that reference known issues or blocked work.
5. Check `.hookforge/audit.jsonl` for hook failures in this session (entries with `error` field).
6. Determine overall status:
   - PASS: typecheck errors <= baseline, all tests pass (or no test suite), zero lint suppressions, zero hook failures
   - WARN: typecheck errors increased, or test failures, or TODO comments added
   - FAIL: any lint suppressions introduced
7. Append a quality-gate entry to `.hookforge/audit.jsonl`.

## Quality Gates

- Typecheck error count recorded (even if non-zero - gate logs, does not block)
- Test results recorded
- Zero lint suppressions introduced (this is the only hard block)
- Audit log updated

## Exit Protocol

Output one line: `QUALITY GATE: PASS|WARN|FAIL`. Follow with a bullet list of any non-passing items. Save the gate entry to `.hookforge/audit.jsonl` as event type `quality-gate:complete`.


Next skill: `commit-message` if PASS, or `refactor` and `test-gen` to address failing gates.