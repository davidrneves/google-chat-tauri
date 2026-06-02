# Skill: systematic-debugging

**Description**: Diagnose a bug using a 4-phase observe-hypothesize-verify-fix protocol that prevents premature fixing.
**Version**: 1.0.0 | **Effort**: medium

## Identity

systematic-debugging is a hookforge skill that applies structured root cause analysis to bugs and unexpected behaviour, following a 4-phase protocol that requires a verified hypothesis before any code change.

**Example:** `/do why does login return 400?` → root cause identified (missing Content-Type header), minimal reproduction, fix verified with test

## When to Use

- When a bug is present but its cause is not obvious from the error message
- When a fix was applied but the bug recurred
- When `/do` routes "fix", "debug", or "reproduce"

## Orientation

The most common debugging failure is fixing symptoms instead of causes. This skill prevents that by requiring a verified hypothesis before writing any code. Time spent verifying beats time spent reverting wrong fixes.

Circuit breaker: after 3 consecutive hypothesis failures, stop and report what was ruled out. Do not keep guessing - the next step requires information not yet available.

**Handoff consumption:** If a prior session left a handoff at `.planning/handoffs/`, read its "Current state" and "Blockers" sections before starting Phase 1. Prior sessions may have already eliminated hypotheses -- start from where they stopped, not from scratch.

## Protocol

**Phase 1 - Observe**
1. Reproduce the bug. Verify it is reliably reproducible before proceeding. If not reproducible, document the conditions under which it occurs.
2. Collect evidence: error messages, stack traces, logs, network responses, unexpected output values.
3. Identify the boundary: where does correct behaviour end and incorrect behaviour begin?
4. Document triggering conditions: what input/state/timing causes it? What does NOT trigger it?

**Phase 2 - Hypothesize**
1. Form 2-3 candidate hypotheses that explain the observation. Write them explicitly.
2. For each hypothesis, write the specific observable consequence that would be true if the hypothesis holds.
3. Rank by probability. Start with the most likely.

**Phase 3 - Verify**
1. Test the top hypothesis with the smallest possible probe: add a log line, inspect a value, run a targeted unit test, check a type.
2. If the prediction holds: hypothesis confirmed. Move to Phase 4.
3. If not: eliminate this hypothesis, log what was ruled out, try the next.
4. Circuit breaker: after 3 failed hypotheses, stop. Report ruled-out paths and what information is needed to continue.

**Phase 4 - Fix**
1. Fix the confirmed root cause, not the symptom.
2. Write a regression test that would have caught this bug before writing the fix.
3. Apply the fix.
4. Run the test suite.
5. Verify the original reproduction case no longer triggers the bug.

## Quality Gates

- Bug was reliably reproduced before any code was changed
- At least 2 hypotheses were formed and evaluated before fixing
- Fix targets the root cause (regression test confirms this)
- Regression test added and passing

## Exit Protocol

Report: root cause confirmed, fix applied, and regression test written. If the circuit breaker triggered, report the 3 ruled-out hypotheses and what additional information is needed to proceed.

Next skill: `test-gen` - expand test coverage around the fix to prevent regression, or `postmortem` if this was a campaign-blocking incident.