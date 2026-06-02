# Skill: architect

**Description**: Converts a PRD or user description into a buildable architecture document - file tree, component breakdown, data model, phased build plan with machine-verifiable end conditions ready for Archon.
**Version**: 1.0.0 | **Effort**: high

## Identity

architect converts a PRD (or a plain description + existing codebase) into a campaign-ready architecture document. It decides HOW to build what the spec describes. Its output drives Archon's phase decomposition.

**Example:** `/do design a multi-tenant SaaS auth system` → component diagram, tech stack choices with rationale, and 6 Archon phases ready to execute

## When to Use

- After `/prd` produces an approved PRD
- When the user has a clear direction and an existing codebase (no PRD needed)
- When `/do` routes a build request at Complexity >= 3

## Mode Detection

**Greenfield mode**: PRD exists with `Mode: greenfield`, or no existing source files.

**Feature mode**: Existing source files present OR PRD has `Mode: feature`. In feature mode, read the file tree first. Architecture describes changes to existing code, not a standalone system.

## Protocol

### Step 1: READ

**If PRD exists**: read it. Extract core features, technical decisions, end conditions, and out-of-scope items.

**If no PRD**: scan the file tree, read `package.json` (or equivalent), read main entry points, and use the user's description as the spec.

### Step 2: EVALUATE OPTIONS

For any architectural decision with multiple valid approaches, generate 2-3 candidates. For each, assess: implementation complexity, risk, maintainability, and LLM-friendliness. Pick the winner and document why.

### Step 3: DRAFT ARCHITECTURE

Write a structured architecture document covering:

**File tree** — show only new and modified files in feature mode; show full tree in greenfield.

**Component breakdown** — one paragraph per major component: what it does, its boundary, what it depends on.

**Data model** — entities, relationships, and key constraints. Skip if purely algorithmic.

**Technical decisions** — one entry per key choice: decision, rationale, alternatives rejected.

**Risk register** — top 3-5 risks with mitigation strategies. Always include "typecheck regression" for feature mode.

**Phased build plan** — 3-8 phases, ordered by dependency. Each phase must have:
- A single clear goal
- A machine-verifiable end condition: file_exists, command_passes (e.g. `bunx tsc --noEmit`), metric_threshold, or visual_verify
- An estimated file count

### Step 4: WRITE OUTPUT

Write the document to `.planning/architecture/{slug}.md`. Present the file path to the user.

In feature mode, Phase 0 is always: "Baseline — record current typecheck errors and test pass rate before any changes."

### Step 5: CONFIRM

Ask one question: "Does this architecture look right, or should I adjust anything before we start?" Wait for confirmation before the user proceeds to Archon.

## Quality Gates

- Every phase must have at least one non-manual end condition
- Never create phases that can be parallelized in a way that creates merge conflicts
- File tree must be consistent with technical decisions (no orphaned directories)
- Risk register must include at least one risk specific to this project's constraints

## Exit Protocol

Output: "Architecture written to `.planning/architecture/{slug}.md`. Run `/do` or invoke `/archon` with this file to begin the build."

Next skill: `create-app` - execute the build across the phased plan, using the architecture document as the spec.