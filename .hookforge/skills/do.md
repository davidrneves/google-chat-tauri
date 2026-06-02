# Skill: do

**Description**: Unified intent router - reads the routing table from harness.json and dispatches to the cheapest capable skill via a 3-tier cascade.
**Version**: 1.0.0 | **Effort**: low

## Identity

do is hookforge's single entry point for all agent work. The user states an intent; do routes to the cheapest capable skill. It applies the 3-tier cost ladder on every invocation and stops at the first confident match.

**Example:** `/do add OAuth login to the dashboard` → routes to `create-app` (feature mode) after classifying scope as Complexity 3, cross-domain

## When to Use

- As the default entry point for any request when you don't know the exact skill
- When the intent is clear but the right skill name is not
- Every invocation: routing is transparent and announces the decision before acting

## Orientation

Routing is a token-cost problem. A trivial request routed through an LLM classifier wastes ~500 tokens. A complex refactor routed to a bare regex fails silently. The cascade is ordered cheapest-first.

The 4 active tiers in hookforge:
- **Tier 0**: Regex match on raw input (~0 tokens). Catches unambiguous CLI commands and pattern-matched tasks.
- **Tier 1**: Active campaign state short-circuit (~0 tokens). Resumes an in-progress campaign without an LLM call.
- **Tier 2**: Keyword match from the routing table in `.hookforge/harness.json` (~0 tokens). Catches named intents mapped to installed skills. Only runs when a routing table exists.
- **Tier 3**: LLM intent classifier (~500 tokens). Uses a built-in intent-to-skill map covering all installed skills.

## Protocol

### Step 0: Load Routing Table

Read `.hookforge/harness.json`. Extract `routing.tier0.patterns` and `routing.tier2.keywords`.

If the file does not exist or has no `routing` key: set both to empty. Note this in the exit report and suggest running `/routing-rules` to generate one.

---

### Tier 1: Active Campaign State (~0 tokens)

Before Tier 0 pattern matching, check whether a campaign is actively waiting to be resumed.

1. Read `.hookforge/state.json`. Extract `activeCampaign` field.
2. If `activeCampaign` is non-null and non-empty:
   a. Check `.hookforge/campaigns/{activeCampaign}.json` for campaign metadata if the file exists.
   b. If input matches `/^(continue|keep going|proceed|go ahead|do it|yes|confirm)$/i` or is empty: immediately invoke `/archon continue`. Skip Tiers 0-3. Done.
   c. If input mentions the campaign name or references work matching the active campaign scope: invoke `/archon continue`. Done.
   d. Otherwise: proceed to Tier 0 normally. The campaign stays active; the user is directing unrelated work.
3. If `activeCampaign` is null or the file does not exist:
   a. If input matches `/^(proceed|go ahead|do it|yes|confirm)$/i`: look at the most recent assistant message in this session. Identify the last concrete action explicitly suggested or described (a command to run, a file to edit, a skill to invoke, a commit to make). Execute that action directly. Skip Tiers 0-3. Done. If no concrete prior action can be identified, ask: "What would you like to proceed with?"
   b. Otherwise: skip to Tier 0.

Never error on a missing `.hookforge/state.json`. If the file is absent, treat `activeCampaign` as null.

---

### Tier 0: Regex Match (~0 tokens)

Test raw input against the built-in patterns first, then any patterns from `routing.tier0.patterns`. First match wins.

Built-in patterns (applied before routing table entries):

| Pattern | Action |
|---|---|
| `/^(typecheck\|type.?check\|tsc)/i` | Run the project's typecheck command |
| `/^build/i` | Run the project's build command |
| `/^tests?$/i` | Run the project's test command |
| `/^commit$/i` | Invoke `commit-message` skill |

If matched -> execute the action directly. Skip to Exit Protocol.

---

### Tier 2: Keyword Match (~0 tokens)

**Only runs if `routing.tier2.keywords` is non-empty.**

Lowercase the input and strip punctuation. Test it against each key in `routing.tier2.keywords` using a case-insensitive substring check. First confident match wins.

If one skill matches -> announce the routing decision and invoke the skill. Done.
If multiple skills match -> fall through to Tier 3 for disambiguation.
If no keywords present -> fall through to Tier 3.

---

### Tier 3: LLM Classifier (~500 tokens)

Classify the input across two dimensions:

```
INTENT: fix | create | refactor | document | review | debug | generate | commit | route | handoff | quality | postmortem | pattern
SCOPE: single-symbol | single-file | multi-file | cross-domain
```

Map INTENT to skill (first match wins):

| INTENT | Skill |
|---|---|
| fix | `systematic-debugging` |
| debug | `systematic-debugging` |
| refactor | `refactor` |
| document | `doc-gen` |
| review, audit, merge review | `code-review` |
| generate (tests) | `test-gen` |
| commit | `commit-message` |
| route, routing | `routing-rules` |
| handoff | `session-handoff` |
| quality | `quality-gate` |
| postmortem, debrief | `postmortem` |
| pattern, create skill | `create-skill` |
| plan, campaign, orchestrate | `archon` |
| fleet, parallel, multi-task | `fleet` |
| triage, prioritize, classify, backlog | `triage` |
| verify, validate, acceptance | `verify` |
| deploy, deployment | `deploy` |
| release, ship, changelog | `release` |
| research, investigate | `research` |
| prd, requirements, spec, product | `prd` |
| app, create app, new project | `create-app` |
| scaffold, boilerplate | `scaffold` |
| design, ui design | `design` |
| migrate, migration, schema change | `migration` |
| pr review, pull request | `merge-review` |
| qa, browser test, manual test | `qa` |
| watch, monitor, file changes | `watch` |
| improve, quality loop, optimize | `improve` |
| learn, extract, knowledge base | `learn` |
| wiki, docs site, documentation site | `wiki` |
| cost, token, budget | `cost` |
| diagram, ascii, visualize | `ascii-diagram` |
| organize, cleanup, houseclean | `houseclean` |
| architect, architecture | `architect` |
| setup, onboard, install | `setup` |
| experiment, try approach | `experiment` |
| infra, infrastructure, cloud | `infra-audit` |
| telemetry, observability, metrics | `telemetry` |
| schedule, schedule task | `schedule` |
| autopilot, autonomous | `autopilot` |
| map, codebase map | `map` |
| workspace, context, env | `workspace` |
| dashboard, status overview | `dashboard` |
| marshal, subagent, delegate | `marshal` |
| daemon, background, persistent | `daemon` |
| live preview, ui preview | `live-preview` |
| web ui debug, browser debug | `web-ui-debug` |
| pr watch, monitor pr | `pr-watch` |

Before invoking, announce: "Routing to `/{skill}` because [one-sentence reason]."

If no skill maps to the intent and the task is a simple single-file edit -> perform the edit directly without routing.

If no skill maps and the task is complex -> output: "No skill matched this intent. Consider running `/create-skill` to capture this as a reusable pattern."

---

## Quality Gates

- Verify the target skill exists in `.hookforge/skills/` before invoking. Never invoke a skill that is not installed.
- Tier 0 and Tier 2 must resolve without any LLM call.
- Tier 3 must announce the routing decision before acting.
- When the input is empty or whitespace: output the full list of installed skills and prompt for intent.

## Exit Protocol

Relay the routed skill's output directly. Do not add a routing summary wrapper around it.

If the routed skill produces a handoff, relay it as-is.

If routing failed at all tiers: report which tier failed, why it failed, and suggest `/routing-rules` if no routing table was found.

Next skill: follows the Exit Protocol of whichever skill was routed to.