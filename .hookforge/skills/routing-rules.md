# Skill: routing-rules

**Description**: Generate or update the cost-proportional routing table for the project's agent harness.
**Version**: 1.0.0 | **Effort**: low

## Identity

routing-rules is a hookforge skill that reads the project's installed skills, audit history, and task patterns to generate an updated 4-tier routing table in harness.json.

**Example:** `/do update routing rules` → updated `harness.json` routing table with new keyword patterns derived from recent session history

## When to Use

- After adding a new skill and wanting fast Tier 2 routing for it
- When inputs are frequently falling through to the LLM classifier (Tier 3)
- When `/do` routes "routing" or "add route"

## Orientation

The routing table is the primary cost-reduction mechanism. Sending a typecheck question to a campaign orchestrator wastes minutes per occurrence. Every entry must be a proven pattern from real usage - not a guess.

The 4-tier cost ladder: Tier 0 (regex, ~0 tokens), Tier 1 (active campaign state lookup, ~0 tokens), Tier 2 (skill keyword match, ~0 tokens), Tier 3 (LLM classifier, ~500 tokens).

## Protocol

1. Read the current routing table from `.hookforge/harness.json` (if exists).
2. Load installed skills from the skills directory. For each skill, extract name, description, and first two protocol step verbs as keywords.
3. Read `.hookforge/audit.jsonl` to identify recurring task patterns by hook event frequency (if exists).
4. Build Tier 0 patterns: exact regex for unambiguous CLI commands, file type operations, and pattern-matched tasks. Each pattern must be a valid JavaScript regex.
5. Build Tier 2 keyword table: map each skill's 3-5 keywords to its skill name. Flag any keyword that maps to more than one skill - ambiguous keywords belong in Tier 3, not Tier 2.
6. Write the updated `routing` section to `.hookforge/harness.json` with structure: `{ tier0: { patterns: [...] }, tier2: { keywords: {...} } }`.
7. Print the generated table for review.

## Quality Gates

- Every installed skill has at least 2 keyword entries in Tier 2
- All Tier 0 patterns compile as valid JavaScript regex (`new RegExp(pattern)` does not throw)
- No keyword maps to more than one skill

## Exit Protocol

Print the generated routing table grouped by tier. Report how many entries are new vs. updated. Prompt the user to verify Tier 0 patterns against real usage before committing - wrong Tier 0 patterns create false positives that are hard to diagnose.

Next skill: `quality-gate` - verify the updated routing rules don't create conflicts or dead zones in the tier hierarchy.