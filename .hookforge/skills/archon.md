# Skill: archon

**Description**: Multi-session campaign executor. Takes large, complex work and drives it to completion across sessions. Decomposes into phases, delegates to sub-agents, reviews output against quality standards, maintains campaign state in .planning/campaigns/.
**Version**: 1.0.0 | **Effort**: high
**Requires**: subagents

## Identity

archon is the campaign executor. Use it when:
- Work spans multiple sessions
- Needs persistent state (what's done, what's left, what was decided)
- Requires quality judgment beyond "does it compile"
- Benefits from strategic decomposition into phases

Not for: quick fixes (use a skill), single-session work (use marshal), parallel execution (use fleet).

**Example:** `/do build a full auth system with tests and docs` → 4-phase campaign executed across sessions; each phase picks up where the last left off

## When to Use

- When a task spans multiple sessions or requires coordinating 3+ agents
- When decomposing a large feature into a structured campaign with phases
- When `/do` routes "plan", "campaign", or "orchestrate"

## Commands

| Command | Behavior |
|---|---|
| `/archon [direction]` | Create new campaign and begin execution |
| `/archon continue` | Resume most recent active campaign |
| `/archon status` | Show campaign state (same as /dashboard filtered to campaigns) |

## Protocol

### Step 1: WAKE UP

On every invocation:

1. Read CLAUDE.md (project architecture and conventions)
2. Check `.planning/campaigns/` for active campaigns (not in `completed/`)
3. Determine mode:
   - **Resuming**: active campaign exists and input is "continue" or matches campaign scope -> read it, continue from Active Context
   - **Directed**: user gave a direction -> create new campaign, decompose, begin
   - **Undirected**: no direction, no active campaign -> run Health Diagnostic

### Step 2: DECOMPOSE (new campaigns only)

Break the direction into 3-8 phases:

1. Analyze scope: which files, directories, and systems are involved?
2. Identify dependencies: what must happen before what?
3. Create phases in order:

| Phase Type | Purpose |
|---|---|
| research | Understand before building |
| plan | Make architecture decisions |
| build | Write code |
| wire | Connect systems together |
| verify | Confirm everything works |
| prune | Remove dead code, clean up |

**Effort budget by phase type** (set `effort` in sub-agent delegation):

| Phase Type | Effort Level |
|---|---|
| audit | low |
| build | high |
| refactor | medium |
| design | medium |
| verify | low |

4. For each phase, write machine-verifiable end conditions. Every phase must have at least one non-manual condition. Types: `file_exists`, `command_passes`, `metric_threshold`, `manual`. Manual-only phases are not acceptable as the sole condition.

5. Write the campaign file to `.planning/campaigns/{slug}.md`:

```markdown
---
version: 1
id: "{uuid}"
status: active
started: "{ISO}"
direction: "{original direction}"
phase_count: N
current_phase: 1
---

# Campaign: {name}

## Phases

| # | Status | Type | Phase | Done When |
|---|--------|------|-------|-----------|
...

## Phase End Conditions

| Phase | Condition Type | Check |
|-------|---------------|-------|
...

## Feature Ledger

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|

## Decision Log

## Continuation State

Current phase: 1
Next: {what to do}
checkpoint-phase-1: none
```

### Step 2.5: DAEMONIZE? (new campaigns with 2+ estimated sessions)

After creating the campaign, if estimated session count >= 2:

Ask: "This is multi-session work (~{N} sessions). Run continuously? [y/n]"

If yes: delegate to `/daemon start --campaign {slug}`.
If no: continue to Step 3. Campaign exists; user continues manually.

Skip when: resuming an existing campaign; only 1 session estimated; daemon already running.

### Step 3: EXECUTE PHASES

For each phase:

1. **Direction check**: Is this phase still aligned with the campaign goal?

2. **Create phase checkpoint**:
   ```bash
   git stash push --include-untracked -m "hookforge-checkpoint-{slug}-phase-{N}"
   ```
   - Capture stash ref and write to Continuation State: `checkpoint-phase-N: stash@{0}`
   - If git stash fails (clean working tree): log `checkpoint-phase-N: none`. Never block.

3. **Delegate**: Spawn a sub-agent with full context injection:
   - CLAUDE.md content
   - Phase-specific direction and scope
   - Relevant decisions from the campaign's Decision Log
   - Effort parameter matching the phase type

4. **Verify end conditions**: Before marking a phase complete:
   - `file_exists`: check the file on disk
   - `command_passes`: run the command, verify exit 0
   - `metric_threshold`: run command, parse output, compare
   - `manual`: log to Review Queue; don't block
   - If ANY non-manual condition fails: phase is NOT complete. Fix first.

5. **Review**: Read the sub-agent's HANDOFF. Did it accomplish the phase goal?

6. **Record**: Update the campaign file:
   - Mark the phase complete/partial/failed
   - Add entries to the Feature Ledger
   - Log any decisions to the Decision Log

7. **Self-correct**: Run checks from Step 4 (quality, regression, direction)

8. **Continue**: Move to the next phase

### Step 4: SELF-CORRECTION (Mandatory)

#### Direction Alignment (every 2 phases)

After every 2nd phase: Re-read the original Direction. Compare to the Feature Ledger. If drift detected: write a Decision Log entry explaining what drifted and either course-correct (rewrite remaining phases) or park (direction fundamentally changed).

#### Quality Spot-Check (every phase)

After each phase: Read the most significant output. Does it meet the project's quality bar (strict types, clean structure, follows CLAUDE.md conventions)? If quality is below bar: add a remediation task before marking complete.

#### Regression Guard (every build phase)

After each build phase: Run typecheck. Compare error count to the campaign's baseline (0 at campaign start).
- 1-2 new errors: fix before continuing
- 3-4 new errors: log warning, attempt fix, continue if resolved
- 5+ new errors: PARK the campaign. Something went structurally wrong.

#### Anti-Pattern Scan (every build phase)

Scan modified files for:
- `transition-all` (name specific properties)
- `confirm()`, `alert()`, `prompt()` (use in-app components)
- Hardcoded values that should be constants

If found: fix before marking the phase complete.

### Step 5: CONTINUATION (before context runs low)

1. Update the campaign file's Active Context section
2. Write a detailed Continuation State: current phase and sub-step, files modified, blocking issues, what should happen next

### Step 6: COMPLETION

When all phases are done:

1. Run final verification (`bunx tsc --noEmit`)
2. Update campaign status to `completed`
3. Move campaign file to `.planning/campaigns/completed/`
4. Suggest `/learn` to extract patterns from the campaign
5. Output final HANDOFF

## Health Diagnostic (Undirected Mode)

When invoked without direction:

1. Check `.planning/intake/` for pending items -> suggest `/autopilot`
2. Check for active campaigns -> suggest continuing
3. Check for recently completed campaigns -> suggest `/learn`
4. Run typecheck: if errors are climbing, suggest a "fix type errors" campaign
5. If nothing: "No active work. Give me a direction or run `/dashboard`."

## Campaign File Structure

Store campaigns at `.planning/campaigns/{slug}.md`. Active campaigns are in this directory. Completed campaigns move to `.planning/campaigns/completed/`.

The slug is derived from the direction: lowercase, hyphens, max 40 chars. Example: "add-user-auth" or "refactor-db-layer".

## Quality Gates

- Every phase must produce a verifiable result
- Campaign file updated after every phase
- Sub-agents receive full context (CLAUDE.md + phase-specific scope)
- Never re-delegate the same failing work without changing the approach
- Continuation State written before context runs low
- Direction alignment passes every 2 phases

## Circuit Breakers

Park the campaign when:
- 3+ consecutive failures on the same approach
- Fundamental architectural conflict discovered
- Quality spot-check fails 3 times in a row
- 5+ new type errors in a single build phase

## Recovery

To roll back to a previous checkpoint:
```bash
git stash pop stash@{N}
```
Find the ref in the campaign file's Continuation State: `checkpoint-phase-N: stash@{N}`.

## Fringe Cases

- **No active campaign + no direction**: Run Health Diagnostic
- **Campaign file corrupted**: Skip that file, treat as no active campaign, report corruption
- **`git stash` fails**: Log `checkpoint-phase-N: none` and continue
- **`.planning/campaigns/` missing**: Treat as no active campaigns
- **Sub-agent returns no HANDOFF**: Treat phase as partial, move on

## Exit Protocol

```
---HANDOFF---
- Campaign: {name} - Phase {current}/{total}
- Completed: {what was done this session}
- Decisions: {key choices made}
- Next: {what the next session should do}
- Reversibility: amber - multi-phase campaign, revert with: git stash pop <checkpoint-ref>
---
```

Next skill: `postmortem` - after the campaign completes, capture what happened and extract prevention heuristics into the project knowledge base.