# Skill: improve

**Description**: Autonomous quality improvement loop. Scores a target against a rubric using a minimum-of-three-evaluators model, selects the highest-impact gap, attacks it, verifies the improvement, and loops until convergence or budget exhaustion.
**Version**: 1.0.0 | **Effort**: high
**Requires**: subagents

## Identity

improve drives quality from its current level to its potential maximum. It scores the target against a rubric, selects the lowest-scored dimension with the highest leverage, attacks it, verifies, and loops. It stops when the score plateaus (level-up saturation) or budget is exhausted.

**Example:** `/do improve hookforge` → scored 17 axes, selected `documentation_accuracy` (selection score 1.4), fixed 3 stale claims, re-scored 7 → 9

## When to Use

- When a product, repo, or component should be evaluated against a quality rubric
- For sustained, multi-loop quality campaigns with plateau detection
- When `/do` routes "improve" or "quality loop"

## Commands

| Command | Behavior |
|---|---|
| `/improve [target]` | Full loop: score -> select -> attack -> verify -> loop |
| `/improve [target] --score-only` | Score the target, report gaps, no modifications |
| `/improve [target] --continue` | Resume an in-progress improve campaign |
| `/improve [target] --campaign` | Run as a long-running campaign via archon |

## Protocol

### Step 1: SCORE

Score the target against a rubric using minimum-of-three evaluators.

**Build the rubric** (if not provided):
- Read the target (file, directory, or skill)
- Identify 4-6 quality dimensions relevant to the target type:
  - For code: correctness, type safety, test coverage, readability, performance, security
  - For skills: completeness, degraded fallback quality, fringe case handling, clarity
  - For documentation: accuracy, completeness, examples, navigability

**Run three independent evaluations** (spawn 3 evaluator sub-agents if subagents available):

Each evaluator receives:
- The target content
- The rubric dimensions
- Instructions to score 0-10 per dimension with justification
- Instruction to NOT read other evaluators' scores

After all three complete:
- For each dimension: take the MINIMUM score of the three evaluators (not average)
- This is the "floor score" - the weakest link across all three perspectives

**Why minimum-of-three**: A dimension that scores 8, 9, and 3 across evaluators has a real gap at 3. Averaging to 6.7 hides that gap. The minimum exposes it.

**Score table output**:
```
=== Quality Scores: {target} ===

Dimension          | E1  | E2  | E3  | Floor | Priority
-------------------|-----|-----|-----|-------|----------
Correctness        |  8  |  9  |  8  |   8   | low
Type safety        |  6  |  7  |  3  |   3   | HIGH - attack
Test coverage      |  5  |  5  |  4  |   4   | medium
Readability        |  7  |  8  |  7  |   7   | low
Security           |  9  |  9  |  8  |   8   | low

Overall floor: 3 / 10 (limited by type-safety)
```

### Step 2: SELECT

Select the target for improvement:
- Highest-impact gap = lowest floor score with highest leverage
- Leverage factors: "fixing this unblocks other dimensions", "affects the most users", "is a prerequisite for other improvements"
- When multiple dimensions are tied at the floor: pick the one that, when improved, is most likely to raise other scores

Announce: "Attacking `{dimension}` (floor: {score}/10). Approach: {1-sentence description}."

### Step 3: ATTACK

Execute the improvement:

1. Spawn an attack agent with:
   - The target
   - The selected dimension and its floor score
   - Evaluation notes from the evaluators that scored it lowest (the specific criticisms)
   - The project's CLAUDE.md
2. The attack agent makes the changes
3. After completion: read the HANDOFF to confirm changes were made

If attack fails (agent returns error or no-op): try one different approach. If second attempt also fails: skip this dimension, log it as `blocked`, proceed to the next gap.

### Step 4: VERIFY

After each attack:

1. Run the rubric scoring again on the changed target (single evaluator is acceptable here)
2. Confirm the attacked dimension improved: score must be > previous floor score
3. Confirm no other dimension regressed: each dimension must be >= previous floor - 1 (small regression tolerance)

If the attacked dimension did NOT improve: revert the change (`git stash pop`), mark the dimension as `blocked-no-improvement`, move to Step 2 for the next gap.

If a different dimension regressed significantly (>2 points drop): revert, record the tradeoff, try a narrower attack.

### Step 5: LOOP OR EXIT

**Continue the loop** if:
- Floor score improved this round
- Budget remaining
- Unattacked dimensions remain with floor < 7

**Stop (level-up achieved)** if:
- Floor score >= 8 across all dimensions -> output "Level-up achieved"
- Distribution saturation: all remaining low-score dimensions have been attacked twice without improvement -> output "Distribution saturated - these gaps require structural changes beyond this tool"

**Stop (budget exhausted)** if:
- Budget parameter exceeded
- 3+ consecutive failed attacks

**Level-Up Protocol (distribution saturation)**:

When the same 2-3 dimensions keep scoring low despite attacks:
1. Flag the pattern: "Structural barrier detected. These dimensions require changes beyond the target's scope."
2. Identify what upstream dependency or design decision is causing the saturation
3. Suggest a campaign: "The root cause is {X}. This requires `/archon [direction]` to fix."
4. Output the level-up report and stop the loop

### Step 6: REPORT

```
=== Improvement Report: {target} ===

Rounds: {N}
Starting floor: {initial score}
Final floor: {final score}
Change: +{delta} points

Improvements:
  - {dimension}: {before} -> {after} | {one-line description of change}

Blocked dimensions:
  - {dimension}: {why it couldn't be improved}

Structural barriers:
  - {if any level-up plateau was detected}

Next session: {what to attack next if improvement loop wasn't exhausted}
```

## Campaign Mode (`--campaign`)

When `--campaign` is passed:
1. Create an improve campaign file at `.planning/campaigns/improve-{target-slug}.md`
2. Delegate to `/archon` with the improve protocol as the campaign direction
3. Use `/daemon` for continuous execution

Campaign mode is appropriate when:
- The target is large (more than 1 session needed)
- You want daemon to run improve autonomously overnight
- Multiple targets need improvement sequentially

## Score-Only Mode (`--score-only`)

Run Steps 1-2 only. No modifications. Output:
- The full score table
- Priority-ordered gap list
- Recommended first attack
- Estimate of sessions needed to reach floor >= 7 across all dimensions

Use this for: auditing quality before deciding whether to run the full loop.

## Fringe Cases

- **Target is a directory**: Score a representative sample (3-5 most significant files). Note: "Scoring {N} of {total} files."
- **No rubric provided + type unknown**: Ask one question: "What quality dimensions matter most for this target?"
- **Single evaluator available** (degraded mode): Accept higher variance in scores. Run 2 rounds of scoring instead of 1, take the minimum across both rounds.
- **Attack reverts all changes**: Record `blocked-reverted` for that dimension. Do not retry with the same approach.
- **Target doesn't exist**: "Target {path} not found. Check the path and re-run."

## Quality Gates

- Minimum-of-three scoring (or justified single-evaluator degraded mode)
- Attacks must be verified before marking a dimension improved
- Regressions must be caught and reverted
- Budget must be tracked; hard stop at 0
- Loop termination condition must be met (not infinite)

## Exit Protocol

```
---HANDOFF---
- Improved: {target}
- Rounds: {N}
- Floor score: {before} -> {after}
- Next attack: {if not exhausted}
- Structural barriers: {if level-up plateau reached}
---
```


Next skill: `learn` to extract improvement patterns into the project knowledge base.