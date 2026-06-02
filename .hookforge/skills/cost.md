# Skill: cost

**Description**: Deep cost exploration and transparency. Shows real token usage, session costs, campaign spend, burn rates, and model breakdown. Reads session data for exact numbers when available. Complements /dashboard with focused cost views.
**Version**: 1.0.0 | **Effort**: low
**Requires**: telemetrySession

## Identity

cost gives you the full cost picture. It reads real token data from session files and combines it with hookforge's campaign attribution to answer: how much did this cost, where did the money go, and is it worth it?

**Example:** `/do how much did this campaign cost?` → $4.23 total across 8 sessions; 82% on Archon phases; median $0.53/session

## When to Use

- At the end of a session to review token usage and identify expensive operations
- When a campaign burn rate seems unexpectedly high
- When `/do` routes "cost", "token usage", or "budget"

## Commands

| Command | Behavior |
|---|---|
| `/cost` | Current session cost and burn rate |
| `/cost today` | Today's total spend |
| `/cost week` | This week's spend |
| `/cost campaign {slug}` | Total spend for a specific campaign |
| `/cost all` | Lifetime cost summary |

## Protocol

### Step 1: READ DATA

Run session-tokens.js script for real token data:

```bash
node scripts/session-tokens.js              # current session
node scripts/session-tokens.js --today      # today's sessions
node scripts/session-tokens.js --all        # all sessions
```

Also read:
- `.hookforge/telemetry/cost-tracker-state.json` for live burn rate
- `.hookforge/telemetry/session-costs.jsonl` for campaign attribution

If `session-tokens.js` is unavailable or fails, fall back to session-costs.jsonl and mark output as "(estimated)".

### Step 2: RENDER BASED ON SCOPE

**Current session (`/cost` with no args):**

```
=== Session Cost Report ===
Session: {sessionId, first 8 chars}
Started: {relative time}
Duration: {N} min

Tokens:
  Input:          {N} tokens
  Output:         {N} tokens
  Cache creation: {N} tokens
  Cache read:     {N} tokens
  Total:          {N} tokens

Cost: ${total}
Burn rate: ${rate}/min
Messages: {N}

Model breakdown:
  claude-opus-4-7:   {N} messages (${cost}, {pct}%)
  claude-haiku-4-5:  {N} messages (${cost}, {pct}%)

Cache efficiency: {pct}% of input tokens served from cache
  (Higher = more cost-efficient. Cache reads cost ~10x less.)
```

**Today / Week / All (`/cost today`, `/cost week`, `/cost all`):**

```
=== Cost Report: {Today | This Week | All Time} ===

Summary:
  Sessions: {N}
  Total cost: ${total}
  Subagents spawned: {N}
  Total messages: {N}

Top 5 sessions by cost:
  ${cost}  {duration}min  {agents} agents  {msgs} msgs  {date}
  ...

By campaign:
  {slug}: ${cost} across {N} sessions
  _unattached: ${cost} across {N} sessions

Average session: ${avg} | ${rate}/min | {duration} min
```

**Campaign (`/cost campaign {slug}`):**

```
=== Campaign Cost: {slug} ===

Total: ${cost} across {N} sessions
Average session: ${avg}

Sessions:
  {date}: ${cost} ({duration} min, {agents} agents, {msgs} msgs)
  ...
```

### Step 3: ADD CONTEXT

- If burn rate > $2/min: "Burn rate is high. Consider whether subagent-heavy work could be restructured."
- If cache hit rate < 50%: "Low cache hit rate. Long conversations with many tool results tend to have lower cache efficiency."
- If no real data (degraded mode): "Cost data is estimated. Real token data becomes available when sessions complete."

## Quality Gates

- Always show real data when available, estimated when not
- Always label data source: (real) vs (est)
- Never claim specific dollar savings from hookforge - show raw facts
- Round costs to 2 decimal places, tokens to nearest K/M

## Exit Protocol

cost is a read-only tool. After displaying the report, wait for next command.


Next skill: `experiment` to optimize expensive patterns identified in the cost analysis, or `telemetry` for a deeper session breakdown.