# Skill: fleet

**Description**: Parallel campaign orchestrator. Runs multiple independent campaigns in coordinated waves within a single session. Spawns 2-3 agents per wave, collects discoveries, shares context between waves. Does not write code - reads, plans, spawns, reviews, coordinates.
**Version**: 1.0.0 | **Effort**: high
**Requires**: subagents, worktrees

## Identity

fleet is the parallel orchestrator. Use it when you have 2+ independent tasks that can run simultaneously and won't stomp on each other's files. It breaks a campaign into waves, spawns agents for each wave, collects their discoveries, and plans the next wave based on results.

Not for: single-task work (use archon), everything-in-one-session (use marshal), work that is fundamentally serial (use archon).

**Example:** `/do add auth and payments at the same time` → 2 agents run in parallel in separate worktrees; changes merged after conflict review

## When to Use

- When a task decomposes into 3+ independent subtasks that can run in parallel
- When running the same workflow against multiple targets simultaneously
- When `/do` routes "fleet", "parallel", or "multi-task"

## Commands

| Command | Behavior |
|---|---|
| `/fleet [direction]` | Decompose into waves and execute in parallel |
| `/fleet --quick [direction]` | Skip wave planning, spawn all tasks in one wave |
| `/fleet continue` | Resume paused fleet session |
| `/fleet speculative [target]` | Run fleet without scope-overlap checking (risky, fast) |

## Protocol

### Step 1: DECOMPOSE INTO WAVES

1. Read CLAUDE.md
2. Analyze the direction: what are the independent sub-tasks?
3. Build a dependency graph:
   - Tasks that share no files are parallelizable
   - Tasks that read output from another task must run in a later wave
4. Group into waves (max 3 agents per wave for manageable cost)
5. Write the fleet session file to `.planning/fleet/{slug}-session.json`:

```json
{
  "id": "{uuid}",
  "status": "active",
  "direction": "{original direction}",
  "created": "{ISO}",
  "waves": [
    {
      "id": 1,
      "status": "pending",
      "tasks": [
        {"id": "1a", "description": "...", "scope": ["src/auth/", "tests/auth/"]},
        {"id": "1b", "description": "...", "scope": ["src/api/", "tests/api/"]}
      ]
    }
  ],
  "discoveries": [],
  "shared_context": ""
}
```

6. Register scope claims in `.planning/coordination/claims/`:
   - One file per task: `{task-id}.json` with `{ "scope": [...], "status": "pending" }`
   - Check for overlaps before starting: if two tasks claim the same file, separate them into different waves

### Step 2: SCOPE OVERLAP CHECK

Before executing each wave:

1. Read all claim files in `.planning/coordination/claims/`
2. For each pair of tasks in the wave: check if their scope arrays share any paths
3. If overlap detected: move the conflicting task to the next wave. Log: "Wave {N} task {id} deferred - scope overlap with {other-id} on {files}."
4. If no overlap: proceed

**Speculative mode** (`--speculative` flag): skip scope overlap check. Faster but risks merge conflicts. Only use when tasks are known to be truly independent.

### Step 3: EXECUTE WAVES

For each wave:

1. **Create worktrees** (one per task, if worktrees capability available):
   ```bash
   git worktree add .worktrees/wave-{N}-{id} -b fleet/{slug}-wave{N}-{id}
   ```
   If worktrees unavailable: create branches instead (see degraded.worktrees).

2. **Build shared context brief** to inject into all agents:
   - Campaign direction
   - CLAUDE.md highlights
   - Discoveries from previous waves
   - "Do NOT modify these files: {files claimed by other active tasks}"

3. **Spawn agents** (one per task in this wave) with:
   - Task-specific direction and scope
   - The shared context brief
   - worktree path (or branch name if no worktrees)
   - Effort level based on task type

4. **Wait for all agents to complete** (timeout: 10 minutes per agent; if an agent times out, mark the task as `partial` and extract partial output from its last HANDOFF)

5. **Collect discoveries** from each HANDOFF:
   - What files were changed
   - What was learned (architectural insights, fringe cases found, decisions made)
   - Blockers encountered

6. **Relay discoveries** to the session file:
   ```json
   "discoveries": [
     {"wave": 1, "task": "1a", "files_changed": [...], "insights": "...", "blockers": "..."},
     ...
   ]
   ```
   Compress the discovery set: deduplicate insights that appear in 2+ tasks; flag contradictions.

7. **Update shared_context** for the next wave: summarize all discoveries in 2-3 sentences.

8. **Mark wave complete** in session file.

### Step 4: INTER-WAVE SYNC

After each wave and before the next:

1. Check for merge conflicts between the wave's branches/worktrees:
   - If using worktrees: `git diff fleet/{slug}-wave{N}-{task-a}..fleet/{slug}-wave{N}-{task-b}`
   - If conflicts: resolve before proceeding to next wave

2. Check for contract changes (types, API shapes, exported functions):
   - If task A changed a type that task B depends on: add a "pick up contract changes" step to the first task of the next wave that consumes it

3. Run typecheck against the base branch. If errors: stop and fix before spawning the next wave.

4. Merge completed wave branches into main (or a campaign integration branch) before starting the next wave.

### Step 5: RECOVERY

If an agent returns no HANDOFF or times out:

1. Extract the partial output (files changed, last logged state)
2. Mark the task as `partial`
3. Add the unfinished work to the next wave with a "pick up from partial" prefix in the direction
4. Never silently discard partial work

**Dead instance recovery**: if a fleet session has `status: active` but no agents are running (checked by looking at `.planning/fleet/{slug}-session.json` for tasks that are `in-progress` but no longer being worked), reset those tasks to `pending` and re-run the wave.

### Step 6: COMPLETION

When all waves are done:

1. Run final typecheck
2. Merge all branches if not already merged
3. Update session file: `status: completed`
4. Clean up worktrees: `git worktree remove .worktrees/wave-*`
5. Clean up scope claim files: `rm .planning/coordination/claims/{slug}-*.json`
6. Output final HANDOFF with discovery summary

## --quick Mode

`/fleet --quick [direction]` skips wave planning. All tasks run in one wave:

1. Decompose direction into independent tasks (use Tier 3 LLM classification)
2. Scope-overlap check
3. Spawn all tasks simultaneously (up to 3)
4. Report results

Use for: 2-3 clearly independent tasks where you already know they won't conflict.

## Quality Gates

- Never spawn more than 3 agents in a single wave
- Scope overlap check must run before every wave (unless --speculative)
- Typecheck must pass before each wave starts
- Discovery relay must capture all HANDOFF outputs
- Partial task output must never be silently discarded
- All worktrees/branches cleaned up on completion

## Fringe Cases

- **Single task detected**: Downgrade to marshal. "Only one task found - no need for fleet. Routing to marshal."
- **All tasks share files**: Run sequentially (no waves). "Tasks are interdependent - running sequentially."
- **Wave fails catastrophically** (3+ agent failures): Pause fleet, surface blockers to the user.
- **`.planning/fleet/` missing**: Create it before writing session file.
- **`.planning/coordination/claims/` missing**: Create it before writing claim files.

## Session File Location

Fleet sessions are stored at `.planning/fleet/{slug}-session.json`. When `continue` is invoked, fleet reads all active sessions (status: active) and resumes the most recently modified one.

## Exit Protocol

```
---HANDOFF---
- Fleet session: {slug}
- Waves completed: {N}/{total}
- Tasks: {list with status}
- Discoveries: {compressed discovery summary}
- Blockers: {any unresolved conflicts or partial tasks}
- Next: {if incomplete, what wave to start with and why}
---
```

Next skill: `merge-review` - check for branch conflicts and claim violations before merging the parallel wave output.