# Skill: postmortem

**Description**: Generate a structured postmortem from a completed campaign's history, telemetry, and git log.
**Version**: 1.0.0 | **Effort**: low

## Identity

postmortem is a hookforge skill that reads a completed campaign's files, git history, and audit log to produce a structured postmortem capturing what went well, what went wrong, and concrete action items.

**Example:** `/do postmortem on last night's failed deploy` → timeline, root cause (missing env var), and 3 action items with owners

## When to Use

- After a failed campaign, broken deploy, or production incident
- At the end of a significant session to document what was learned
- When `/do` routes "postmortem" or "debrief"

## Orientation

A postmortem is only useful if it produces durable changes: updated skills, new quality gates, updated routing rules, or explicit decisions not to repeat a pattern. A postmortem that produces no action items is just documentation.

Blameless framing: the goal is system improvement, not fault assignment.

## Protocol

1. Read the campaign file from `.planning/campaigns/` or `.planning/campaigns/completed/`. Extract: phase count, dates, commit range, feature ledger.
1a. Read all handoff documents in `.planning/handoffs/` dated within the campaign range. Use "What was done this session" and "Decisions made" sections to fill in the timeline and decision log -- this is often more detailed than the campaign file.
2. Run `git log --oneline <start>..<end>` for the campaign's commit range to build the timeline.
3. Read `.hookforge/audit.jsonl` for hook events during the campaign (if exists). Note: hook failures, long sessions, circuit-breaker triggers.
4. Identify evidence for each category:
   - **Went well**: phases completed cleanly on first attempt, decisions that proved correct
   - **Took longer than expected**: phases with multiple retries, commits with `fix:` prefixes that followed the phase's primary work
   - **Broke or was reverted**: `revert:` commits, unexpected type error spikes
   - **Blocking moments**: phases marked `blocked` or `failed` in the campaign ledger
5. Write the postmortem with sections:
   - **Summary** (3 sentences: what was built, elapsed time, overall quality assessment)
   - **Timeline** (phase-by-phase: what happened, how many retries, key decisions)
   - **What went well** (specific evidence, not generic praise)
   - **What did not go well** (specific root cause for each item)
   - **Action items** (concrete changes: which skill to update, which quality gate to add, which routing rule to tighten)
6. Save to `.planning/postmortems/YYYY-MM-DD-<campaign-slug>.md`.

## Quality Gates

- At least one action item that produces a durable change (not just "be more careful")
- Root cause identified for each thing that did not go well
- Timeline consistent with git log (no fabricated entries)

## Exit Protocol

Output the postmortem to terminal and save it. Print action items as a separate checklist. Return the file path.

Next skill: `improve` - run an improvement campaign targeting the gaps identified in the action items.