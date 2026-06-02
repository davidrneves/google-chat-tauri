# Skill: learn

**Description**: Extracts reusable patterns, pitfalls, and decisions from completed campaign files and telemetry. Writes structured knowledge entries to .planning/knowledge/. Run after finishing a body of work to capture what was learned.
**Version**: 1.0.0 | **Effort**: low

## Identity

learn extracts durable knowledge from completed work. It reads campaign files, postmortem docs, and session audit logs, then produces structured knowledge entries that future sessions can reference. It does NOT write code — it writes documentation of what worked, what didn't, and why.

**Example:** `/do learn from the last campaign` → 3 knowledge entries written to `.claude/knowledge/`: error pattern, test strategy, architecture decision

## When to Use

- After a campaign completes
- After a difficult bug is resolved
- After a postmortem is written
- When the user says "remember this", "save that pattern", or "learn from that"

## Protocol

### Step 1: DISCOVER SOURCES

Look for knowledge sources in order:

1. **Campaign files**: `.planning/campaigns/completed/` — read the Decision Log and Feature Ledger of recently-completed campaigns. Find campaigns completed in the last 30 days.
2. **Postmortems**: `.planning/postmortems/` — read any postmortem files. Focus on "Root Cause" and "What Would Have Helped" sections.
3. **Audit log**: `.hookforge/audit.jsonl` — read the last 200 lines. Look for repeated event patterns (same error appearing multiple times, tools called in the same sequence repeatedly).
4. **User-specified**: if the user named a specific file or topic, read that first.

If none of these exist, tell the user: "No campaign history or audit log found. Complete a campaign first, then run `/learn` to extract patterns."

### Step 2: EXTRACT PATTERNS

For each source, extract:

**Patterns that worked** — repeatable sequences that led to success. Examples:
- "Read the existing test file before writing new tests; the project uses a custom matcher"
- "Run typecheck before and after every refactor phase to catch regressions early"

**Pitfalls** — things that caused failures or wasted time. Examples:
- "Renaming a Zod schema breaks downstream validators silently — always grep for usages first"
- "The project's `bun run build` caches aggressively; clear cache after config changes"

**Decisions** — architectural or process choices made and their rationale. Examples:
- "Chose `z.record` over `z.map` for the degraded field because Zod's `z.map` has no JSON serializer"

### Step 3: ORGANIZE

Group extracted items by topic domain:
- Testing
- TypeScript / type system
- Build system
- Campaign process
- Project-specific (named after the project or subsystem)
- Tool/library-specific (named after the external tool)

### Step 4: WRITE KNOWLEDGE ENTRIES

Write to `.planning/knowledge/{topic-slug}.md`. If the file already exists, append new entries — do not overwrite.

Format per file:

```markdown
# Knowledge: {Topic}

> Last updated: {ISO date}
> Sources: {list of source files consulted}

## Patterns

### {Pattern Name}
**What**: {description}
**Why it works**: {brief explanation}
**Example**: {optional — one-line code or command}
**Source**: {campaign slug or postmortem file}

...

## Pitfalls

### {Pitfall Name}
**Symptom**: {what you see when this happens}
**Root cause**: {why it happens}
**Prevention**: {what to do differently}
**Source**: {campaign slug or file}

...

## Decisions

### {Decision Name}
**Context**: {when this choice applies}
**Decision**: {what was chosen}
**Rationale**: {why}
**Alternatives rejected**: {brief list}
**Source**: {campaign slug}

...
```

### Step 5: UPDATE INDEX

After writing, append a summary line to `.planning/knowledge/INDEX.md` (create if it doesn't exist):

```markdown
| {YYYY-MM-DD} | [{topic}]({file}) | {one-line summary} |
```

### Step 6: REPORT

Present a summary to the user:
- How many knowledge entries were written (new vs. updated)
- Top 2-3 patterns extracted
- Any critical pitfalls that should be addressed immediately

## Quality Gates

- Never fabricate patterns — every entry must be grounded in a specific source (file, log line, or campaign event)
- Do not write generic programming advice that applies to all projects
- Pitfalls must include a Prevention strategy, not just a description
- Entries must be specific enough to be actionable ("don't use async in hooks" not "be careful with async")

## Exit Protocol

Output: "Knowledge written to `.planning/knowledge/{files}`. {N} new entries, {M} updated. Key pattern: {top finding in one sentence}."

Next skill: `improve` - run a quality improvement campaign targeting the systemic gaps the extracted patterns reveal.