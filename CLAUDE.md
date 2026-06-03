<!-- BEGIN HOOKFORGE (managed - do not edit) -->
# Hookforge Harness

This project has the hookforge agent harness installed for Claude Code.

## Routing

Use cost-proportional routing for all requests:

| Tier | Match | Action | Cost |
|------|-------|--------|------|
| 0 | Exact pattern (regex) | Execute directly | ~0 tokens |
| 1 | Active campaign state | Resume campaign | ~0 tokens |
| 2 | Skill keyword match | Invoke skill | ~0 tokens |
| 3 | LLM classifier | Route via model | ~500 tokens |

Default to the cheapest path that correctly handles the request.

## Rules

- Never skip planning for non-trivial tasks
- Commit atomically: one logical change per commit
- Prefer editing existing files to creating new ones
- Run typecheck and tests before marking work complete
- Circuit breaker: stop after 3 consecutive failures, explain, ask

## Skills

| Skill | Effort | Description |
|-------|--------|-------------|
| `/code-review` | medium | Execute a 5-pass structured code review covering correctness, security, performance, readability, and consistency. |
| `/commit-message` | low | Generate a conventional commit message from staged or unstaged changes. |
| `/create-skill` | low | Capture a repeated workflow pattern as a SKILL.md file reusable across sessions. |
| `/do` | low | Unified intent router - reads the routing table from harness.json and dispatches to the cheapest capable skill via a 3-tier cascade. |
| `/doc-gen` | low | Generate inline documentation, README sections, or API reference from source code. |
| `/postmortem` | low | Generate a structured postmortem from a completed campaign's history, telemetry, and git log. |
| `/quality-gate` | low | Run cold-path quality checks at session end: typecheck, test suite, lint suppressions, and hook audit. |
| `/refactor` | medium | Execute safe multi-file refactoring with typecheck verification at each step and rollback checkpoints. |
| `/routing-rules` | low | Generate or update the cost-proportional routing table for the project's agent harness. |
| `/scaffold` | medium | Generate new files matching the project's naming conventions, folder structure, and code patterns. |
| `/session-handoff` | low | Produce a structured context transfer document so the next session resumes without re-reading history. |
| `/systematic-debugging` | medium | Diagnose a bug using a 4-phase observe-hypothesize-verify-fix protocol that prevents premature fixing. |
| `/test-gen` | medium | Generate test cases in the Arrange-Act-Assert pattern matched to the project's test framework. |
| `/architect` | high | Converts a PRD or user description into a buildable architecture document - file tree, component breakdown, data model, phased build plan with machine-verifiable end conditions ready for Archon. |
| `/archon` | high | Multi-session campaign executor. Takes large, complex work and drives it to completion across sessions. Decomposes into phases, delegates to sub-agents, reviews output against quality standards, maintains campaign state in .planning/campaigns/. |
| `/ascii-diagram` | medium | Generates perfectly aligned ASCII diagrams using a programmatic character-grid approach. Layout is computed from box dimensions before any characters are placed, guaranteeing alignment by math rather than token prediction. |
| `/autopilot` | medium | Intake-to-delivery pipeline. Processes pending items from .planning/intake/ by briefing each one and then building and verifying them. Drop a markdown file in .planning/intake/ and invoke this skill. |
| `/cost` | low | Deep cost exploration and transparency. Shows real token usage, session costs, campaign spend, burn rates, and model breakdown. Reads session data for exact numbers when available. Complements /dashboard with focused cost views. |
| `/create-app` | high | End-to-end application creation pipeline. Five tiers from blank scaffold to full AI generation. Integrates /prd -> /architect -> /archon automatically. Use for new apps, major new features, or integrating new services. |
| `/daemon` | low | Continuous autonomous operation controller. Starts, stops, and monitors a self-rescheduling agent loop that drives an active campaign to completion without manual session re-invocation. Default path uses the SessionStart hook bridge. Pass --remote to use cloud-persistent scheduling. |
| `/dashboard` | low | Real-time harness observability dashboard. Reads campaigns, fleet sessions, telemetry, and pending queues to present a snapshot of harness state at a glance. Invoked by phrases like "what's happening" and "show activity". |
| `/deploy` | medium | Execute a structured deployment to a target environment with pre-flight checks and rollback readiness. |
| `/design` | medium | Design manifest generator. Extracts a living design system from an existing UI codebase (extract mode) or generates a fresh design manifest from a project description (generate mode). Output drives visual consistency across all components. |
| `/experiment` | medium | Automated optimization loop with a scalar fitness function. Proposes changes in isolated worktrees, measures with a metric command, keeps improvements, discards failures. Supports convergence detection and diminishing returns. |
| `/fleet` | high | Parallel campaign orchestrator. Runs multiple independent campaigns in coordinated waves within a single session. Spawns 2-3 agents per wave, collects discoveries, shares context between waves. Does not write code - reads, plans, spawns, reviews, coordinates. |
| `/houseclean` | medium | Cross-platform storage audit and cleanup. Surveys all drives, finds orphaned git worktrees, large AI tool caches, and rebuildable artifacts. Produces a prioritized action plan with specific migration or deletion commands. |
| `/improve` | high | Autonomous quality improvement loop. Scores a target against a rubric using a minimum-of-three-evaluators model, selects the highest-impact gap, attacks it, verifies the improvement, and loops until convergence or budget exhaustion. |
| `/infra-audit` | medium | Maps current infrastructure from config files. Reads docker-compose, .env.example, ORM configs, and CI workflows to produce a structured infrastructure manifest. Flags misconfigs, exposed secrets patterns, and missing observability. |
| `/learn` | low | Extracts reusable patterns, pitfalls, and decisions from completed campaign files and telemetry. Writes structured knowledge entries to .planning/knowledge/. Run after finishing a body of work to capture what was learned. |
| `/live-preview` | low | Mid-build visual verification loop. Takes screenshots of components during construction, not just after. Catches visual regressions and invisible features before they compound. Requires Playwright. |
| `/map` | low | Structural codebase index generator. Builds a compact JSON map of files, exports, imports, dependency graph, and roles. Queryable by keyword. Injected into fleet agents as context slices to reduce token usage on code navigation. |
| `/marshal` | medium | Single-session meta-orchestrator. Takes any direction - broad, specific, or vague - and chains skills and context into results. Gathers context from codebase and docs, makes decisions without asking, and drives work to completion within one session. |
| `/merge-review` | low | Reviews pending fleet worktree merges before they are accepted. Reads the merge-check queue, detects file-level conflicts between branches, proposes a safe merge order, and surfaces reconciliation plans for overlapping changes. |
| `/migration` | medium | Plan, write, and safely apply a database or schema migration with rollback. |
| `/organize` | medium | Three-pass directory structure scanner. Detects architecture violations, hygiene issues, and bloat. Generates a prioritized cleanup plan with specific move/rename/delete commands. |
| `/pr-watch` | high | Local PR auto-fix. Monitors CI status, automatically fixes failing checks by reading failure logs and applying targeted fixes, then optionally merges when all checks pass. Local terminal analog to cloud auto-fix features. |
| `/prd` | high | Converts a natural language app description into a structured Product Requirements Document. Asks focused clarifying questions, defines scope, stack, and architecture, and produces a PRD that Archon can decompose into a campaign. |
| `/qa` | high | Browser-based QA verification. Launches a real browser, navigates the app, clicks buttons, fills forms, and tests user flows. Works standalone or as a phase end condition in campaigns. Requires Playwright. |
| `/release` | low | Prepare and publish a release: changelog, version bump, git tag, and release notes. |
| `/research` | medium | Focused research investigations. Converts questions into structured findings with confidence levels and source citations. Does not make decisions — produces information that informs the next step. |
| `/schedule` | low | Manages recurring and one-off scheduled tasks. Session-scoped scheduling via CronCreate/CronDelete/CronList. Default path uses the local OS scheduler. Explains the cloud path for tasks that need to survive machine sleep. |
| `/setup` | medium | First-run experience for hookforge. Detects the runtime, installs hooks, writes .hookforge/state.json, and guides the user through the minimal configuration needed to start using the harness. |
| `/telemetry` | low | Unified telemetry hub. Shows current session cost, today's spend, all-time totals, hook activity, trust level, and a directory of every telemetry command available. Single entry point for anyone asking "what does this cost" or "what telemetry does hookforge have". |
| `/triage` | high | GitHub issue and PR investigator. Pulls open issues and PRs, classifies them, searches the codebase for root cause, proposes fixes with file:line references, and optionally implements fixes. Handles both issues and pull requests. |
| `/verify` | low | Self-test the hookforge hook pipeline from within a live session. Exercises real tool calls and checks that hooks fired, telemetry accumulated, and no errors occurred. Reports HOOK HEALTH PASS or FAIL with per-hook breakdown. |
| `/watch` | low | File sentinel that monitors the working directory for changes and @hookforge marker comments, then auto-triggers appropriate skills. Poll-based via git diff against last scan commit. Writes intake items for batch processing. Default path is a local filesystem runner; --remote uses session-scoped CronCreate. |
| `/web-ui-debug` | high | Classifies web UI bugs by type, routes to research-backed investigation strategies per category, and verifies fixes with a generator-evaluator pattern using Playwright. Composes systematic-debugging, qa, and live-preview. |
| `/wiki` | medium | Builds and maintains a structured knowledge wiki from the codebase and campaign history. Uses the Karpathy llm-wiki ingest pattern - each document is a living page that accumulates related knowledge over time. |
| `/workspace` | high | Multi-repo campaign coordinator. Runs fleet/archon inside each repository in dependency order. The unit of work is a repo, not a task. Use when the same change needs to touch multiple codebases simultaneously. |
<!-- END HOOKFORGE -->
