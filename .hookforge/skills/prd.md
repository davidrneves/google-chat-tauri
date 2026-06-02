# Skill: prd

**Description**: Converts a natural language app description into a structured Product Requirements Document. Asks focused clarifying questions, defines scope, stack, and architecture, and produces a PRD that Archon can decompose into a campaign.
**Version**: 1.0.0 | **Effort**: high

## Identity

prd converts "I want an app that does X" into a structured document that Archon can execute. It does NOT build anything. It produces the spec that drives the build.

**Example:** `/do write requirements for a notifications feature` → PRD with 5 user stories, 12 acceptance criteria, and an explicit out-of-scope section

## When to Use

- At the start of a new feature when requirements are vague or undocumented
- To convert a one-sentence idea into a structured product spec before coding
- When `/do` routes "prd", "requirements", or "spec"

## Mode Detection

**Greenfield mode**: No existing source files, or user says "new app" / "from scratch."

**Feature mode**: Project has existing source files. User describes a feature to add, not a whole app. In feature mode: read the existing file tree before asking questions; the existing stack is fixed; end conditions must include regression checks.

## Protocol

### Step 1: UNDERSTAND

Read the user's description. Determine mode.

Ask up to 3 focused questions — only questions that would change the architecture. Examples:
- "Is this for you personally or will other people use it?"
- "Does this need user accounts and login?"
- "Should this integrate with your existing auth, or is it standalone?"

Do NOT ask about tech stack in greenfield mode yet (Step 3).
In feature mode: the stack is already decided — skip tech stack questions.

### Step 2: RESEARCH (optional)

If the app concept has well-known implementations, run `/research` on "how similar apps typically work" to identify common patterns and user expectations.

### Step 3: DEFINE STACK

**Greenfield**: Recommend a stack based on the user's context (language preference, team size, deployment target). Present your recommendation and rationale. Allow overrides.

**Feature mode**: The stack is the existing project's stack. Record it, do not change it.

### Step 4: WRITE THE PRD

Write to `.planning/prd/{slug}.md` using this structure:

```markdown
# PRD: {App Name}

> Mode: greenfield | feature
> Date: {ISO date}
> Status: draft

## Overview

One paragraph. What this is, who it's for, what the user's core goal is.

## Core Features

Numbered list. Each feature is one sentence. No sub-bullets. No implementation details.

1. {Feature}
2. {Feature}
...

## Out of Scope

Explicit list of what this PRD does NOT cover (prevents scope creep).

## Architecture

**Stack**: {language}, {framework}, {database/storage}, {deployment}
**Shape**: {monolith | service | SPA+API | CLI | lib}
**Integration points**: {list of external systems, APIs, or existing code this touches}

## Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| {area} | {choice} | {one-sentence reason} |

## End Conditions

Definition of "done" for this PRD (not individual features — the whole thing):

- [ ] {testable condition}
- [ ] {testable condition}
...

## Phases (draft)

Rough phase breakdown for Archon. Will be refined by /architect.

| # | Phase | Done when |
|---|---|---|
| 1 | {name} | {condition} |
...
```

### Step 5: CONFIRM

Present the PRD to the user. Ask: "Does this look right? Anything to add or change?" Revise based on feedback. When the user approves, mark status as `approved`.

### Step 6: HANDOFF

Output: "PRD written to `.planning/prd/{slug}.md`. Run `/architect` to turn this into a buildable architecture."

Next skill: `architect` - convert the approved PRD into a buildable file tree, data model, and phased plan.

## Quality Gates

- Core Features must be testable (avoid "the app should be fast" — use "search results return in under 500ms")
- Out of Scope must have at least 2 items (forces explicit scope decisions)
- End Conditions must be verifiable without subjective judgment
- For feature mode: regression check must be in End Conditions

## Exit Protocol

Output: "PRD written to `.planning/prd/{slug}.md`. Ready for architecture phase."

Next skill: `architect` - convert the approved PRD into a buildable file tree, data model, and phased plan.