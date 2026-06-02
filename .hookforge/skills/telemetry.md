# Skill: telemetry

**Description**: Unified telemetry hub. Shows current session cost, today's spend, all-time totals, hook activity, trust level, and a directory of every telemetry command available. Single entry point for anyone asking "what does this cost" or "what telemetry does hookforge have".
**Version**: 1.0.0 | **Effort**: low
**Requires**: telemetrySession

## Identity

telemetry is the discovery and control surface for hookforge's telemetry system. One command that shows everything, lets you tune or disable any part of it.

**Example:** `/do show telemetry for last session` → 14 hook events, 3 PostToolUse, 1 Stop; inferential sensor overhead 2ms; total cost $0.08

## When to Use

- After a long session to review hook timing, event counts, and skipped events
- When diagnosing whether a hook is triggering as expected
- When `/do` routes "telemetry" or "observability"

## Commands

| Command | Behavior |
|---|---|
| `/telemetry` | Full hub: stats + command directory + settings |
| `/telemetry --costs` | Cost section only |
| `/telemetry --hooks` | Hook activity only (last 20 fires) |
| `/telemetry --config` | Show current telemetry settings |
| `/telemetry off` | Disable session summary, reduce hook verbosity |
| `/telemetry on` | Re-enable all telemetry |
| `/telemetry --threshold N` | Set cost alert threshold step (e.g. `--threshold 10` = alert every $10) |

## Protocol

### Step 1: COLLECT DATA

Read the following. All optional - treat missing as zero/empty.

**Session cost:**
- Run `node scripts/session-tokens.js --today 2>/dev/null` if the script exists
- Fallback: read `.hookforge/telemetry/cost-tracker-state.json`
- Mark clearly: `$X.XX [real]` vs `$X.XX (est)`

**Historical costs:**
- Run `node scripts/session-tokens.js --all 2>/dev/null` for all-time totals
- Read last 20 lines of `.hookforge/telemetry/session-costs.jsonl`
- For each entry: prefer `real_cost` > `override_cost` > `estimated_cost`

**Hook activity:**
- Read last 20 lines of `.hookforge/telemetry/hook-timing.jsonl`
- For each entry: extract `hook`, `duration_ms`, `timestamp`
- Check `.hookforge/telemetry/hook-errors.jsonl` for recent blocks

**Trust level:**
- Read `.hookforge/harness.json` -> `trust` field from state
- Compute: novice (sessions < 5), familiar (5-19), trusted (20+ with 2+ campaigns)

**Settings:**
- Read `.hookforge/harness.json` -> telemetry config

### Step 2: RENDER HUB

```
=== hookforge Telemetry ===

CURRENT SESSION
  Cost:       $X.XX [real] | $X.XX (est)
  Duration:   N min | $X.XX/min burn rate
  Tokens:     NNK input | NK output | NK cache read
  Messages:   N
  Hooks fired: N (today)

TODAY
  $X.XX across N sessions

ALL TIME
  $X.XX across N sessions, N campaigns
  Cache savings: ~$X.XX

BY CAMPAIGN (recent 5)
  {slug}: $X.XX - N sessions

HOOK ACTIVITY (last 10 fires)
  {time} | {hook} | {duration_ms}ms | {outcome}
  (no hook timing recorded yet)

TRUST LEVEL
  Level:    {novice | familiar | trusted}
  Sessions: N completed
  Campaigns: N completed

TELEMETRY SETTINGS
  Session summary:  {auto | always | off}
  Cost alerts:      {on | off} at thresholds: {list}
  Hook timing:      {on | off}
  Audit log:        {on | off}

COMMAND DIRECTORY
  /telemetry                  This screen
  /telemetry --costs          Cost breakdown only
  /telemetry --hooks          Hook activity only
  /cost                       Deep cost exploration
  /dashboard                  Full harness state

  cat .hookforge/telemetry/session-costs.jsonl   Raw session cost log
  cat .hookforge/telemetry/hook-timing.jsonl     Raw hook execution log
  cat .hookforge/audit.jsonl                      Raw tool call audit log

CONTROLS
  /telemetry off              Disable session summary + reduce verbosity
  /telemetry on               Re-enable
  /telemetry --threshold N    Alert every $N
```

### Step 3: SUB-COMMANDS

**`/telemetry off`:** Set `telemetrySession: false` in `.hookforge/harness.json`. Output: "Telemetry summary disabled. Safety hooks remain active. Run `/telemetry on` to restore."

**`/telemetry on`:** Set `telemetrySession: true`. Output: "Telemetry re-enabled."

**`/telemetry --threshold N`:** Validate N > 0. Write threshold array to `.hookforge/harness.json`. Output: "Cost alerts will fire at: ${thresholds}"

## Quality Gates

- Never show raw JSONL to the user - always parse and format
- Cost totals must be labeled: (real) vs (est)
- `/telemetry off` must NOT disable safety hooks - make this explicit
- Relative timestamps required - no raw ISO strings

## Exit Protocol

/telemetry is read-only (except `--threshold`, `off`, `on`). After displaying output, wait for next command.


Next skill: `postmortem` to investigate high-cost or failing sessions, or `experiment` to optimize expensive prompt patterns.