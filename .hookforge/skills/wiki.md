# Skill: wiki

**Description**: Builds and maintains a structured knowledge wiki from the codebase and campaign history. Uses the Karpathy llm-wiki ingest pattern - each document is a living page that accumulates related knowledge over time.
**Version**: 1.0.0 | **Effort**: medium

## Identity

wiki builds a structured knowledge base in `wiki/` that captures architecture decisions, domain concepts, API references, and project conventions. It operates like a llm-wiki: each page is a living document that grows by ingest, not by rewrite.

**Example:** `/do document how auth works in this codebase` → `wiki/auth.md` written with architecture overview, decision log, and API reference

## When to Use

- When starting a large project (seed the wiki from existing docs)
- When a campaign completes (ingest what was learned)
- When a new contributor joins (the wiki is their onboarding doc)
- When the user says "document this", "add to the wiki", or "what does X do?"

## Directory Structure

```
wiki/
  INDEX.md            — top-level navigation, auto-generated
  architecture/       — system design, components, data flows
  concepts/           — domain terms, business rules, invariants
  apis/               — endpoint references, request/response shapes
  conventions/        — code style, naming, patterns used in this project
  decisions/          — ADR-format records for non-obvious choices
  runbooks/           — how to do specific operational tasks
```

All subdirectories are created on first use. The wiki root is always `wiki/` from the project root.

## Protocol

### Step 1: DETERMINE OPERATION

Detect the intended operation from context:

- **Seed**: no `wiki/` directory exists, or user says "create wiki" / "init wiki". Create from scratch.
- **Query**: user asks a question ("what is X?", "how does Y work?"). Find and return the relevant page.
- **Ingest**: user says "add to wiki", "document this", or a campaign just completed. Add new content to existing pages.
- **Update**: user provides corrected information for an existing page. Overwrite specific sections.

### Step 2: SEED (first-time)

Read source material in order:
1. `README.md` — architecture overview, project purpose
2. `CLAUDE.md` — project conventions, build commands
3. Recently completed campaign files (`.planning/campaigns/completed/`)
4. Any existing docs directory (`docs/`, `documentation/`)

For each piece of source material, extract:
- Architecture concepts → `wiki/architecture/`
- Domain terms → `wiki/concepts/`
- API endpoints → `wiki/apis/`
- Code conventions → `wiki/conventions/`
- Non-obvious decisions → `wiki/decisions/`

Create a page per concept, not per source file. One page should cover one idea completely.

### Step 3: QUERY

When the user asks a question:

1. Search `wiki/` for the most relevant pages (grep by topic keyword)
2. If found: present the content with the file path
3. If not found: offer to create the page. Ask: "I don't have a wiki page for '{topic}'. Should I research it and create one?"

### Step 4: INGEST (growing the wiki)

When adding new content from a campaign or user-provided text:

1. Identify the most relevant existing page. If none exists, create a new one.
2. Append a dated section to the page:

```markdown
## {Source} — {YYYY-MM-DD}

{new content in the same style as the existing page}
```

Do NOT rewrite the whole page. Append the new section. This preserves history.

3. If the new content contradicts an existing section, flag the contradiction clearly:
```markdown
> NOTE: The section below contradicts the "{section}" section above.
> Source: {campaign slug}. Resolve manually.
```

### Step 5: WRITE PAGES

Each wiki page uses this format:

```markdown
# {Concept Name}

> Last updated: {ISO date}
> Category: architecture | concepts | apis | conventions | decisions | runbooks

{One-paragraph summary. What this is, why it matters.}

## Details

{Main content. Factual, specific, no padding.}

## Related

- [{Related page}](../path/to/page.md)
```

For `decisions/` pages, use ADR format:

```markdown
# Decision: {Title}

> Status: accepted | superseded | proposed
> Date: {ISO date}

## Context

{Why this decision was needed.}

## Decision

{What was decided.}

## Consequences

{What changes because of this decision. What tradeoffs were accepted.}
```

### Step 6: UPDATE INDEX

After any write or ingest operation, regenerate `wiki/INDEX.md`:

```markdown
# Wiki Index

> Updated: {ISO date}

## Architecture

- [{page title}](architecture/{file}.md) — {one-line description}
...

## Concepts

...
```

## Quality Gates

- Never write a wiki page without at least one verifiable source (file path, campaign slug, or URL)
- Do not write wiki pages about things that should be in comments (local implementation details)
- Each page covers one concept. Split if a page grows beyond 300 lines.
- Query mode: always return the file path, not just the content, so the user can navigate to it

## Exit Protocol

- **Seed**: "Wiki created at `wiki/`. {N} pages across {M} categories."
- **Query**: "{Answer from wiki page} — source: `wiki/{path}`"
- **Ingest**: "Added {N} entries to `wiki/{path}`."


Next skill: `doc-gen` to generate detailed technical documentation from the wiki structure, or `learn` to distill wiki insights into the project knowledge base.