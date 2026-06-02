# Skill: create-app

**Description**: End-to-end application creation pipeline. Five tiers from blank scaffold to full AI generation. Integrates /prd -> /architect -> /archon automatically. Use for new apps, major new features, or integrating new services.
**Version**: 1.0.0 | **Effort**: high
**Requires**: subagents

## Identity

create-app is the full app creation pipeline. It detects what you have, decides what kind of creation is needed, and runs the full journey from idea to working code. It integrates /prd, /architect, and /archon automatically - you don't call them separately.

**Example:** `/do build a React dashboard with auth and payments` → working app with all routes, auth flow, and Stripe integration scaffolded end-to-end

## When to Use

- When starting a brand-new project from scratch with no existing code
- When given a one-sentence description and asked to scaffold a working app
- When `/do` routes "create app" or "new project"

## Protocol

**Tier Detection** (run before anything else): Read the current directory. Determine the tier:

| Tier | Signal | Mode |
|------|--------|------|
| 0 | Empty directory or only a README | **blank** - full scaffold from PRD |
| 1 | CLAUDE.md + src/ + no hookforge | **guided** - project exists, user adds a feature |
| 2 | `.hookforge/` initialized, no PRD | **templated** - harness ready, start from template |
| 3 | `.planning/prd/` exists | **generated** - PRD ready, go straight to architect |
| 4 | `.planning/architecture/` exists | **feature-addition** - architecture exists, adding a feature |

Announce detected tier. Ask to confirm if ambiguous.

## Tier 0: BLANK

Complete greenfield build.

1. Ask 3 clarifying questions max:
   - "What does this app do in one sentence?"
   - "Who uses it?"
   - "Any tech constraints? (language, framework, hosting)"

2. Invoke `/prd` to produce a product requirements document
3. Invoke `/architect` on the PRD output to produce the architecture plan
4. Confirm with user: "Here's what I'll build. Proceed?"
5. Create a campaign via `/archon [build {app-name}]` with the architecture plan as direction
6. Let archon execute. Monitor and intervene on quality failures.

## Tier 1: GUIDED

Existing project, user wants to add something new.

1. Read CLAUDE.md and src/ structure to understand the existing app
2. Ask: "What do you want to add?"
3. Use `/architect [add {feature}]` in feature mode to produce an additive plan
4. Check for conflicts with existing code
5. Confirm: "This will touch {N} files. Proceed?"
6. Invoke `/archon [add {feature} to {app-name}]`

## Tier 2: TEMPLATED

hookforge is initialized, no product spec yet.

1. Check `.hookforge/harness.json` for configured tech stack
2. If tech stack is set: use as constraints for /prd
3. Invoke `/prd` for the feature/app being requested
4. Then follow Tier 0 steps 3-6

## Tier 3: GENERATED

PRD exists in `.planning/prd/`. Skip the requirements phase.

1. Read the most recent PRD from `.planning/prd/`
2. Confirm it's the right one: "Using PRD: {name}. Is this what you want?"
3. Invoke `/architect` on the existing PRD
4. Confirm architecture with user
5. Invoke `/archon [build from architecture]`

## Tier 4: FEATURE ADDITION

Both PRD and architecture exist.

1. Read `.planning/prd/` and `.planning/architecture/`
2. Ask: "What feature are you adding?"
3. Check the architecture for the natural integration point
4. Use `/architect [add {feature}]` in feature mode (not full rewrite)
5. Invoke `/archon [implement {feature}]` scoped to the affected files

## Pipeline Stages

Regardless of tier, the pipeline runs these stages. Each must complete before the next starts:

### Stage 1: REQUIREMENTS
Outputs: `.planning/prd/{slug}.md`
Skipped in tiers 3, 4.

### Stage 2: ARCHITECTURE
Outputs: `.planning/architecture/{slug}.md`
Contains:
- Phase decomposition (3-6 phases)
- File tree
- Tech stack
- Key decisions (DB, auth, API style, etc.)
- Machine-verifiable end conditions per phase

### Stage 3: VALIDATION (before building)
Check:
- Does the architecture match the PRD requirements?
- Are there obvious missing pieces (auth but no session management, payments but no webhook handler)?
- Is the tech stack consistent?

If validation fails: fix the architecture before continuing.

### Stage 4: BUILD
Invoke `/archon [build {app-name}]` with full architecture context.

Sub-agent context injection:
- PRD (full text)
- Architecture plan (full text)
- CLAUDE.md
- hookforge capability context

Monitor archon. If it stalls or quality degrades, intervene.

### Stage 5: WIRE

After archon's build phases complete, verify the app is wired together:
- Entry point exists (main.ts, index.ts, app.py, etc.)
- All imports resolve
- Typecheck passes
- Build succeeds
- Dev server starts (if applicable)

If any wiring step fails: spawn a targeted fix agent or fix directly.

### Stage 6: VERIFY

Run the project's full verification suite:
```bash
bunx tsc --noEmit      # typecheck
bun test               # tests
bun run build          # build
```

If tests don't exist: flag it. "No test suite found. Consider adding tests before shipping."

### Stage 7: HANDOFF

Write `.planning/create-app-result.md`:

```markdown
# App Creation Result: {name}

## What Was Built
{1-3 sentences}

## Tier
{tier name and number}

## Stack
{languages, frameworks, key libraries}

## Entry Point
{file path}

## Build Command
{command}

## Test Command
{command if exists}

## Campaign
{campaign slug if created}

## Known Gaps
{anything intentionally deferred}
```

## Scope Management

**Do not gold-plate:**
- Build exactly what the PRD specifies
- If /architect suggests a feature not in the PRD: flag it, don't add it
- If /archon adds something unasked: note it in Known Gaps, don't stop the build

**Do enforce:**
- Typecheck must pass at the end
- Build must succeed at the end
- Entry point must exist at the end

## Quality Gates

- Architecture validated against PRD before build starts
- Typecheck passes at end of every archon phase
- Wiring verified before handoff
- At least one verification command runs successfully

## Exit Protocol

```
---HANDOFF---
- App: {name}
- Tier: {N} ({tier-name})
- Stages completed: {list}
- Status: complete | partial (needs {what})
- Entry point: {file}
- Build: {command}
- Result: .planning/create-app-result.md
---
```


Next skill: `qa` to test the created application end-to-end, or `test-gen` to add automated test coverage.