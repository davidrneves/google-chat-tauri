# Skill: workspace

**Description**: Multi-repo campaign coordinator. Runs fleet/archon inside each repository in dependency order. The unit of work is a repo, not a task. Use when the same change needs to touch multiple codebases simultaneously.
**Version**: 1.0.0 | **Effort**: high
**Requires**: subagents

## Identity

workspace is fleet one level up. Where fleet runs parallel sub-agents inside a single repo, workspace runs fleet or archon sessions inside each of several repos, coordinated in dependency order. Use it when a single goal touches multiple codebases.

**Example:** `/do coordinate the auth feature across frontend and backend repos` → fleet session runs in both repos, changes coordinated in dependency order

## When to Use

- Integrating two services that share a contract
- Bumping a shared library version across all consumers
- Adding a feature that requires changes in backend + frontend + infrastructure repos
- Cross-repo refactoring (rename an API, change a schema)

## Invocation

```
/workspace [direction]
/workspace --repos repo-a,repo-b,repo-c -- [direction]  # explicit repo list
/workspace status                                         # show active workspace session
/workspace continue                                       # resume paused session
```

## Protocol

### Step 1: DISCOVER REPOS

If repos not specified explicitly:

1. Check `.hookforge/harness.json` for `workspace.repos` list
2. Check for a `workspace.json` or `repos.json` in the current directory
3. Scan for adjacent sibling directories that are git repos:
   ```bash
   for dir in ../*/; do [ -d "$dir/.git" ] && echo "$dir"; done
   ```
4. If none found: ask the user which repos to include

For each discovered repo, record:
- Name (dirname)
- Absolute path
- Whether it has a CLAUDE.md
- Whether it has `.hookforge/` initialized

### Step 2: DEPENDENCY ANALYSIS

Determine execution order. Ask the user if ambiguous.

```
Repos:
  api/          (has .hookforge)
  frontend/     (has .hookforge)
  shared-types/ (has .hookforge)

Dependencies:
  shared-types -> (no deps)
  api -> shared-types
  frontend -> api, shared-types

Order: shared-types -> api -> frontend
```

Document this in `.hookforge/workspace-session.json`:
```json
{
  "direction": "...",
  "repos": ["shared-types", "api", "frontend"],
  "dependencyOrder": ["shared-types", "api", "frontend"],
  "waves": [
    {"wave": 1, "repos": ["shared-types"]},
    {"wave": 2, "repos": ["api"]},
    {"wave": 3, "repos": ["frontend"]}
  ],
  "status": "active",
  "startedAt": "ISO"
}
```

### Step 3: BRIEFING

Before spawning agents, prepare a shared context brief for each repo:

```markdown
## Workspace Direction
{direction}

## What Other Repos Are Doing
- shared-types: {what's changing there}
- api: {what's changing there}
- frontend: {what's changing there}

## Your Scope
You are working on: {repo-name}
Your dependencies changed: {list if any}
Your dependents will consume: {list if any}

## Contract
If you are exposing an interface that another repo consumes, document it here:
  - {interface or API changes}
```

This brief is injected into every sub-agent alongside that repo's CLAUDE.md.

### Step 4: EXECUTE BY WAVE

For each wave (repos with no dependencies on unfinished waves):

**With subagents:**
1. Spawn a sub-agent per repo in the wave (all run concurrently within the wave)
2. Agent direction: the shared brief + repo-specific scope
3. Agent works inside the repo using archon or fleet as appropriate
4. Wait for all wave agents to report HANDOFF before starting next wave

**Without subagents (degraded):**
1. Output instructions for manual execution in the correct order
2. Each instruction is: `cd {repo-path} && hookforge init && /archon {direction}`
3. Wait for user confirmation after each repo before continuing

**Wave completion check:**
- Read each agent's HANDOFF
- Verify the repo's typecheck and build pass
- Verify any contract changes are documented
- If any repo fails: stop the wave, report, ask whether to fix or abort

### Step 5: CROSS-REPO SYNC CHECK

After each wave (and before starting the next):

1. Read HANDOFF from all agents that just finished
2. Detect contract changes: did any repo modify a shared type, API response, or schema?
3. If YES: flag it for the consuming repos in the next wave. Inject updated contract into their brief.

Example flag:
```
SYNC NOTE for api/ (next wave):
  shared-types changed: UserProfile.email is now nullable
  Update all non-null assertions in api/src/routes/user.ts
```

### Step 6: FINAL VERIFICATION

After all waves complete:

1. For each repo: run typecheck
2. For each repo: run build
3. Report pass/fail per repo
4. If all pass: workspace session complete

### Step 7: SESSION REPORT

Write to `.hookforge/workspace-session.json` with `status: "complete"`:

```json
{
  "direction": "...",
  "repos": [...],
  "waves": [...],
  "status": "complete",
  "completedAt": "ISO",
  "results": {
    "shared-types": "success",
    "api": "success",
    "frontend": "partial"
  },
  "notes": "..."
}
```

Output:
```
## Workspace Complete

Repos touched: {N}
Waves: {N}

Results:
  shared-types/   success   {N} files changed
  api/            success   {N} files changed
  frontend/       partial   build failing, needs manual fix

Next steps:
  - Fix frontend build (see agent HANDOFF for details)
  - Commit in order: shared-types -> api -> frontend
```

## Quality Gates

- Dependency order always respected (no wave starts before its dependencies finish)
- Contract changes always propagated to consuming repos before they start work
- Typecheck passes in every repo before marking workspace complete
- Agent briefings always include the shared context

## Exit Protocol

```
---HANDOFF---
- Workspace: {direction}
- Repos: {N} total, {N} succeeded, {N} partial, {N} failed
- Remaining: {list of repos needing attention}
- Session: .hookforge/workspace-session.json
---
```


Next skill: `architect` to plan cross-repo changes based on the workspace analysis, or `merge-review` to coordinate pending merges across repos.