# Skill: experiment

**Description**: Automated optimization loop with a scalar fitness function. Proposes changes in isolated worktrees, measures with a metric command, keeps improvements, discards failures. Supports convergence detection and diminishing returns.
**Version**: 1.0.0 | **Effort**: medium
**Requires**: worktrees

## Identity

experiment is an automated optimization loop with a scalar fitness function. It takes a hypothesis, runs isolated experiments, measures results with a metric command, and keeps improvements or discards failures. Automated A/B testing for code changes.

**Example:** `/do optimize the search query latency` → 3 approaches tested in isolation; winner reduces p95 by 40% via index + batch query

## When to Use

- When comparing two implementation approaches with a measurable fitness function
- When optimizing a parameter (threshold, timeout, batch size) with no obvious best value
- When `/do` routes "experiment" or "try approach"

## Inputs

The user provides three things:
1. **scope**: Files to modify (glob pattern, e.g., `src/api/**/*.ts`)
2. **metric**: Shell command that outputs a single number (e.g., `bunx tsc --noEmit 2>&1 | grep -c 'error'`)
3. **budget**: Iteration cap (default: 5) or time cap (e.g., "10 minutes")

If any input is missing, ask for it. The metric MUST output a single number to stdout.

## Protocol

### Step 1: BASELINE

1. Stash any uncommitted changes (restore on exit)
2. Run the metric command. Record the baseline value.
3. Determine direction: lower = better (error count, bundle size) or higher = better (test count, score)?
   Ask if ambiguous.
4. Log: `Baseline: {value} ({metric command})`

### Step 2: ITERATE

For each iteration (up to budget):

**With worktrees (`requires: [worktrees]` met):**
1. Create isolation: spawn a sub-agent in a worktree (`isolation: "worktree"`)
2. Agent modifies files within scope to improve the metric
3. Measure: run metric command in the worktree (with `node scripts/run-with-timeout.js 300` if available)
4. Gate: run typecheck. If it fails, discard immediately.

**Without worktrees (degraded mode):**
1. Create branch: `git checkout -b experiment/{N}`
2. Apply proposed change within scope
3. Measure metric, run typecheck
4. If discarding: `git checkout main && git branch -D experiment/{N}`
5. If keeping: `git checkout main && git merge experiment/{N} && git branch -D experiment/{N}`

**Evaluate:**
- Improved? → KEEP. New baseline = new value.
- Same or worse? → DISCARD.

**Log each iteration:**
```
Iteration {N}: {value} ({delta from baseline}) -> {KEEP|DISCARD}
Change: {one-line description}
```

### Step 3: CONVERGENCE CHECK

After each iteration:
- **Local optimum**: Last 3 iterations all discarded -> stop ("no more improvements found")
- **Diminishing returns**: Last kept improvement < 0.5% -> stop ("diminishing returns")
- **Budget exhausted**: stop

### Step 4: REPORT

Write to `.planning/research/experiment-{slug}.md`:

```markdown
# Experiment: {Description}

> Metric: `{command}`
> Direction: {lower|higher} is better
> Scope: {glob}
> Budget: {N iterations}
> Date: {ISO date}

## Results

| Iteration | Value | Delta | Verdict | Change |
|-----------|-------|-------|---------|--------|
| baseline  | {N}   | -     | -       | -      |
| 1         | {N}   | {+/-} | KEEP    | {desc} |

## Outcome
- **Start**: {baseline}
- **End**: {final}
- **Improvement**: {pct}%
- **Iterations**: {kept}/{total}
- **Stop reason**: {convergence | diminishing | budget}

## Kept Changes
{Changes kept, with commit hashes or branch names}
```

## Common Metrics

| Goal | Metric Command |
|------|----------------|
| Reduce type errors | `bunx tsc --noEmit 2>&1 \| grep -c 'error TS'` |
| Reduce bundle size | `bun run build 2>&1 \| grep -oP 'Total: \K\d+'` |
| Increase test pass rate | `bun test 2>&1 \| grep -oP '\d+ pass'` |
| Reduce file count | `find src -name '*.ts' \| wc -l` |

## Safety Rules

- NEVER modify files outside scope
- ALWAYS use worktree or branch isolation
- ALWAYS run typecheck before keeping a change
- Restore stashed changes on exit, even on error
- If metric command fails, treat as DISCARD

## Quality Gates

- Baseline measured before any iterations
- Every kept iteration improved metric AND passed typecheck
- Every discarded iteration has a logged reason
- Stop reason is one of: convergence, diminishing returns, budget exhausted

## Exit Protocol

```
---HANDOFF---
- Experiment: {description}
- Result: {baseline} -> {final} ({improvement}%)
- Kept: {N}/{total} iterations
- Stop reason: {reason}
- Report: .planning/research/experiment-{slug}.md
---
```


Next skill: `verify` to validate the winning variant meets acceptance criteria, or `refactor` to implement the optimized approach broadly.