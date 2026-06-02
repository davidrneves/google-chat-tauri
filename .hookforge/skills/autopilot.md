# Skill: autopilot

**Description**: Intake-to-delivery pipeline. Processes pending items from .planning/intake/ by briefing each one and then building and verifying them. Drop a markdown file in .planning/intake/ and invoke this skill.
**Version**: 1.0.0 | **Effort**: medium

## Identity

autopilot takes pending work items from `.planning/intake/` and drives them through the full pipeline: brief -> build -> verify. It processes items smallest-first and reports what was completed, blocked, or skipped.

**Example:** `/do process pending intake` → 3 items in `.planning/intake/`: 2 shipped, 1 blocked (missing API key); summary report written

## When to Use

- Items are queued in `.planning/intake/`
- You want to process intake without manual orchestration
- Work is scoped and well-defined (Small or Medium complexity)

Not for: large multi-session campaigns (use archon), parallel execution (use fleet), exploratory work (use marshal).

## Protocol

### Step 1: SCAN

Read all files in `.planning/intake/` and classify:
- `status: pending` -> needs briefing
- `status: briefed` or `status: approved` -> ready to build
- `status: in-progress` -> check if stuck

If `.planning/intake/` is empty or does not exist: "Nothing to process. Drop a markdown file in `.planning/intake/` or run `/setup` to initialize."

### Step 2: BRIEF (for pending items)

For each pending item:

1. Read the intake file
2. Read related files mentioned in the description
3. Research the scope: what files exist, what patterns are established
4. Write the brief into the intake file:
   - **Scope**: Small / Medium / Large
   - **Approach**: How to implement (2-3 sentences)
   - **Files**: Which files to create or modify
   - **Quality gates**: What must be true when done
   - **Risks**: What could go wrong
5. Update the item's status to `briefed`

### Step 3: BUILD (for briefed/approved items)

For each briefed item, smallest-first:

1. Read the brief
2. Execute:
   - Create or modify the listed files
   - Follow project conventions from CLAUDE.md
   - Run typecheck after each change
3. Verify:
   - All quality gates pass
   - Typecheck clean
   - Tests pass (if applicable)
4. Update status to `completed`

### Step 4: REPORT

```
Autopilot processed {N} items:
  {item-1}: briefed -> built -> verified
  {item-2}: briefed (build pending)
  {item-3}: blocked - {reason}
```

## Intake Item Format

```markdown
---
title: "Feature Name"
status: pending | briefed | approved | in-progress | completed
priority: normal | high
target: src/path/to/affected/area/
---

Description of what needs to be done...
```

## Fringe Cases

- **Item has no clear action**: Ask one clarifying question, or skip with note: "Direction unclear. Update the intake file and re-run."
- **Unknown status**: Treat as `pending`.
- **Typecheck fails during build**: Record the failure, move to next item, report the blocker at the end.
- **Large item**: Flag it. "This is Large scope - use `/archon` for multi-session execution."

## Quality Gates

- Read CLAUDE.md before building
- Run typecheck after every file change
- Mark items `completed` only when verification passes
- If an item is blocked, record the reason and continue to the next

## Exit Protocol

```
---HANDOFF---
- Processed {N} intake items
- Built: {list of completed items}
- Blocked: {list with reasons}
- Remaining: {count of items still pending}
---
```


Next skill: `verify` to confirm delivered items meet acceptance criteria.