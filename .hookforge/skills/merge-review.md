# Skill: merge-review

**Description**: Reviews pending fleet worktree merges before they are accepted. Reads the merge-check queue, detects file-level conflicts between branches, proposes a safe merge order, and surfaces reconciliation plans for overlapping changes.
**Version**: 1.0.0 | **Effort**: low
**Requires**: worktrees

## Identity

merge-review is the merge arbitrator. It reviews pending worktree branches created by fleet agents, detects conflicts between them, and proposes a safe merge order. It surfaces analysis - it never merges branches itself.

**Example:** `/do are my fleet worktrees safe to merge?` → branch-A conflicts with branch-B on `auth/index.ts`; safe merge order: B then A

## When to Use

- "check merges"
- "any conflicts"
- "review pending branches"
- "is it safe to merge fleet output"
- After fleet agents complete, before merging back to main

## Invocation Forms

```
/merge-review              # Process the full queue
/merge-review {branch}     # Review a specific branch only
```

## Protocol

### Step 1: READ THE QUEUE

Read `.hookforge/telemetry/merge-check-queue.jsonl`. Each line:
```json
{"branch": "fleet/task-abc", "worktree": "/path/to/worktree", "queuedAt": "ISO"}
```

If file doesn't exist or is empty:
> "No pending merge reviews. Fleet agents haven't completed any worktrees recently."
Stop here.

If invoked with a specific branch: filter to that branch only.

### Step 2: GATHER DIFF DATA

For each pending branch:

```bash
git diff main..{branch} --name-only
git diff main..{branch} --stat
git branch --list {branch}
```

If branch no longer exists (already merged or deleted):
- Mark as `status: "merged"` in queue
- Note: "Branch `{name}` no longer exists - likely already merged. Skipped."
- Continue

### Step 3: DETECT OVERLAPPING FILES

Compare changed file sets pairwise. For each pair that shares changed files:

```bash
git diff main..{branch-A} -- {file}
git diff main..{branch-B} -- {file}
```

Assess conflict nature:
- **Additive**: both branches add to the file (low risk, likely auto-mergeable)
- **Overlapping edits**: both modify the same function/section (medium risk)
- **Contradictory**: one adds, other removes the same code (high risk)

### Step 4: ASSESS RISK

- **low** - no overlapping files
- **medium** - overlaps exist but changes appear additive or in different sections
- **high** - overlaps in the same function, class, or closely coupled section

### Step 5: PROPOSE MERGE ORDER

Order branches: fewest conflicts first, most conflicts last.

If circular dependencies exist (A conflicts with B, B conflicts with C, C with A): escalate to the user. Do not propose an impossible order.

### Step 6: OUTPUT REPORT

```
## Merge Review: {N} branch(es) pending

### Branch: {name}
Files changed: {N}
Overlap with other branches: {branch-X} ({files}) | none
Risk: low | medium | high
Recommendation: merge | review-first | resolve-conflict

---

### Conflicts Detected

{branch-A} and {branch-B} both modified:
  - {file}: {brief description}
Recommended resolution: {which change to keep, or how to combine}

### Proposed Merge Order

1. {branch} - no conflicts, safe to merge first
2. {branch} - depends on #1; review {file} after merging #1
3. {branch} - manual conflict resolution needed in {file}

### Summary
Branches ready to merge: {N}
Branches needing review: {N}
Branches with hard conflicts: {N}
```

### Step 7: UPDATE QUEUE

After report, mark reviewed items:
- Still needing work: `status: "reviewed"`, add `reviewedAt`
- No longer existing: `status: "merged"`

Write updated queue back to `.hookforge/telemetry/merge-check-queue.jsonl`.

### Step 8: CLEANUP MERGED WORKTREES (requires: worktrees)

After updating the queue, check all worktrees:

```bash
git worktree list --porcelain
```

For each worktree (excluding main):
1. Check if branch is merged: `git branch --merged HEAD | grep "{branch}"`
2. If merged AND worktree is clean (no uncommitted changes):
   - `git worktree remove "{path}" --force`
   - `git branch -d "{branch}"`
   - Report: "Cleaned up merged worktree: {branch}"

If `worktrees` capability is absent (degraded mode): skip Step 8, note "Worktree cleanup requires worktree support - run cleanup commands manually."

## Quality Gates

- Never merge branches - only analyse and recommend
- Always update the queue after processing
- Always provide a concrete recommendation per branch
- If all conflicts are circular/unresolvable, escalate clearly

## Exit Protocol

After report, suggest next actions:
- All safe: "All clear. Merge in the order above."
- Conflicts: "Resolve the flagged conflicts before merging. Run `/merge-review` again after resolving."
- Empty queue: "Queue is empty. Nothing to review."


Next skill: `refactor` to resolve identified conflicts, or `commit-message` once all branches are conflict-free and ready to merge.