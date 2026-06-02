# Skill: research

**Description**: Focused research investigations. Converts questions into structured findings with confidence levels and source citations. Does not make decisions — produces information that informs the next step.
**Version**: 1.0.0 | **Effort**: medium

## Identity

research converts a question into structured findings with confidence levels. It does NOT modify code or make decisions — it produces information that informs the next step.

**Example:** `/do investigate best auth pattern for this stack` → 3 options compared with pros/cons; recommendation: JWT with refresh rotation (confidence 0.85)

## When to Use

- Evaluating whether a dependency is current or superseded
- Finding community best practices for a specific technical problem
- Reading official documentation for an API or library before using it
- Checking if a pattern in the codebase has known issues
- Investigating how similar projects solve a problem
- Any time external information is needed before making a decision

## Protocol

### Step 1: FORMULATE

State the research question in one sentence.

Convert it into 2-4 specific search queries:
- Official docs query ("express.js middleware error handling docs")
- Community/GitHub query ("express error middleware best practices site:github.com")
- Technical blog/comparison query ("express vs fastify error handling 2025")
- Release notes query if version-specific ("express 5.x changelog breaking changes")

### Step 2: SEARCH

Execute searches and read actual page content (not just snippets). Use WebSearch for discovery, WebFetch for reading pages.

Source credibility ladder: official docs > GitHub repos with meaningful activity > recent blog posts > forum answers.

Stop at 3-6 credible sources. If sources contradict each other, note the disagreement explicitly.

### Step 3: EXTRACT

For each finding:
- **What**: the specific fact, recommendation, or pattern
- **Source**: URL or reference
- **Relevance**: one sentence on how this applies to the original question
- **Confidence**: high (official docs, verified) | medium (community consensus) | low (single source, opinion)
- **Action**: what the codebase should do with this, or "informational only"

### Step 4: WRITE

Write to `.planning/research/{YYYY-MM-DD}-{topic-slug}.md`:

```markdown
# Research: {Topic}

> Question: {original question}
> Date: {ISO date}
> Confidence: {overall: high | medium | low}

## Findings

### 1. {Finding title}
**What**: {description}
**Source**: {URL}
**Confidence**: {high | medium | low}
**Action**: {recommendation or "informational"}

### 2. {Finding title}
...

## Summary

{2-3 sentences. What the research concluded. What should happen next.}

## Gaps

{What could not be answered. Why. What a follow-up investigation should target.}
```

### Step 5: REPORT

Present the summary and top 2-3 findings to the user. State the overall confidence level.

If the research reveals a clear recommendation: state it. If it reveals ambiguity: present the two strongest positions and their tradeoffs.

## Quality Gates

- Never state a fact without citing a source
- Confidence level must be justified (explain why something is "high" vs "medium")
- If no credible sources found after 3-4 searches: report "Insufficient sources found" rather than fabricating
- Do not make architectural decisions — report findings, let the user decide

## Exit Protocol

Output: "Research written to `.planning/research/{slug}.md`. Overall confidence: {level}. Top finding: {one sentence}."

Next skill: `prd` - turn the investigation findings into a scoped product requirements doc, or `architect` if requirements are already clear.