# Skill: create-skill

**Description**: Capture a repeated workflow pattern as a SKILL.md file reusable across sessions.
**Version**: 1.0.0 | **Effort**: low

## Identity

create-skill is a hookforge skill that observes a repeated pattern from the conversation or codebase, extracts the protocol, and writes it as a SKILL.md file to the project's skills directory.

**Example:** `/do I keep manually summarizing sessions - make a skill` → `2026-06-01-session-summary.md` with Protocol, Quality Gates, and Exit Protocol sections

## When to Use

- When you've executed the same multi-step workflow ≥2 times in a session
- To capture a pattern before switching contexts or ending a session
- When `/do` routes "create skill" or "add skill"

## Orientation

A skill is worth creating when a pattern has recurred more than twice. Premature skill creation (one-off tasks) adds maintenance overhead without payoff. The value compounds: each future invocation costs nothing after the skill is written.

The SKILL.md format: YAML frontmatter (name, description, version, effort, optional requires/sensors/triggers) plus a five-section markdown body.

## Protocol

1. Identify the repeated pattern: what task does the user keep doing the same way?
2. Name the skill: lowercase, hyphen-separated, imperative noun (e.g., `commit-message`, `api-migration`). Must match `/^[a-z][a-z0-9-]*$/`.
3. Write the frontmatter with all required fields: name, description (one sentence), version (`1.0.0`), effort (`low`/`medium`/`high`). Add `requires`, `sensors`, `triggers` if relevant.
4. Write the five-section body:
   - `## Identity` - one-sentence self-description and when it is invoked
   - `## Orientation` - context, quality bar, and invariants (2-5 sentences)
   - `## Protocol` - numbered steps with explicit decision points and branching
   - `## Quality Gates` - verifiable criteria that must be true before reporting success
   - `## Exit Protocol` - output format, how errors are surfaced, cleanup steps
5. Save to `skills/YYYY-MM-DD-<name>.md` (date prefix: today's date in YYYY-MM-DD format).
6. Run `node scripts/skill-lint.js` to validate.
7. Run `hookforge skills list` to confirm it appears.

## Quality Gates

- `node scripts/skill-lint.js` exits 0
- Skill appears in `hookforge skills list` output
- Protocol section has numbered steps with explicit branching
- Quality Gates section has at least one verifiable criterion (not "looks good")

## Exit Protocol

Report the skill file path and lint result. Suggest running `hookforge init` with `--force` to regenerate the runtime config with the new skill included.

Next skill: `routing-rules` - update the harness routing table so the new skill is reachable from natural-language input.