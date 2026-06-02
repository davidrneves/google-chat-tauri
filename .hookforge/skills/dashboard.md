# Skill: dashboard

**Description**: Real-time harness observability dashboard. Reads campaigns, fleet sessions, telemetry, and pending queues to present a snapshot of harness state at a glance. Invoked by phrases like "what's happening" and "show activity".
**Version**: 1.0.0 | **Effort**: low

## Identity

dashboard reads the live state of the harness and presents it in a single, readable snapshot. No wall of JSON. One command, one screen, full picture.

**Example:** `/do status` → active campaigns (2), recent hook events (14), health (all green), agent count — all in one screen

## When to Use

- "What's happening?" / "Status?" / "Show me the dashboard"
- After returning to a project after time away
- When `/do` routes "status", "dashboard", "what's going on", "show activity"
- Directly: `/dashboard`

## Protocol

### Step 1: COLLECT STATE

Read the following. All optional - if missing, treat as empty. Never crash on missing state.

**Campaigns:**
- Glob `.planning/campaigns/*.md`
- For each: read first 40 lines to extract `status:`, `direction:` (truncate to 60 chars), phase progress

**Cost data:**
- Primary: run `node scripts/session-tokens.js --today` and `--all` if the script exists
- Fallback: read `.hookforge/telemetry/session-costs.jsonl` (last 50 lines)
- Group by `campaign_slug`, sum best available cost field

**Fleet sessions:**
- Glob `.planning/fleet/session-*.md`
- For each: read first 30 lines, extract `status:`, wave number, agent count

**Recent telemetry:**
- Read last 50 lines of `.hookforge/telemetry/hook-timing.jsonl`
- Read last 50 lines of `.hookforge/audit.jsonl`
- Merge, sort by timestamp (descending), take top 10

**Hook activity:**
- Read last 20 lines of `.hookforge/telemetry/hook-timing.jsonl`
- Extract hook name, duration_ms, timestamp, outcome (pass/block)

**Hook value counts:**
- Read `.hookforge/telemetry/hook-errors.jsonl` (last 200 lines)
- Count entries per hook type: protect-files, quality-gate, external-gate, circuit-breaker

**Health:**
- Count circuit breaker trips from audit.jsonl (today)
- Count audit entries written today
- Read `.hookforge/state.json` -> trust and session counts

### Step 2: FORMAT RELATIVE TIMESTAMPS

Convert ISO timestamps: "just now" (<60s) | "{N} min ago" (<60min) | "{N} hr ago" (<24h) | "{N} days ago"

### Step 3: RENDER DASHBOARD

```
=== hookforge Dashboard ===
As of: {relative timestamp of most recent event, or "now"}

CAMPAIGNS
  {slug}: Phase {N}/{total} - {direction, max 60 chars}
  Last event: {most recent event for this campaign}
  (none active)

COSTS
  This session: ${cost} | {duration} min | ${rate}/min | {messages} msgs
  Today:        ${today} across {N} sessions
  All time:     ${all_time} across {N} sessions ({data_source})

  By campaign:
    {slug}: ${total} across {N} sessions
    _unattached: ${total} across {N} sessions
  (no cost data recorded yet)

HOOKS VALUE
  Circuit breaker: {N} trips (prevented token spirals)
  Quality gate:    {N} violations caught
  Protect-files:   {N} blocks
  External gate:   {N} actions gated
  Total hook fires today: {N}

FLEET SESSIONS
  {slug}: Wave {N} - {agent count} agents - {status}
  (none active)

RECENT ACTIVITY (last 10 events)
  {relative time} | {hook/event} | {description}
  (no telemetry recorded yet)

HOOK ACTIVITY (last 10 hook fires)
  {relative time} | {hook} | {duration_ms}ms | {outcome}
  (no hook timing recorded yet)

HEALTH
  Circuit breaker trips today: {N}
  Audit entries today:         {N}
  Trust level:                 {novice | familiar | trusted} ({N} sessions, {N} campaigns)

QUICK COMMANDS
  /do continue    - resume active campaign
  /do rollback    - restore last checkpoint
  /telemetry      - cost breakdown, hook activity
  /triage prs     - review open PRs
  /learn          - extract patterns from last campaign
```

### Step 4: FRINGE CASES

**If .planning/ does not exist:** Show all sections with "(none)" values. Add note: "NOTE: .planning/ not found. Run /setup to initialize harness state."

**If .hookforge/ does not exist:** Show dashboard without cost/hook data. Add note: "NOTE: .hookforge/ not found. Run `hookforge init` to install."

**If campaign file is malformed:** Skip it. Log `(1 campaign file skipped - malformed)` in CAMPAIGNS section.

**If telemetry files are large:** Read only the last 50 lines. Note: "Showing last 50 events per log file."

## Quality Gates

- Dashboard must render when all state files are missing
- Never display raw JSON
- Relative timestamps only
- Campaign direction truncated to 60 chars with "..."

## Exit Protocol

dashboard does not produce a HANDOFF block. It is read-only. After displaying, wait for next command.


Next skill: the skill matching the most urgent active campaign shown on the dashboard.