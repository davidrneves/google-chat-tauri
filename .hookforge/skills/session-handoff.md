# Skill: session-handoff

**Description**: Produce a structured context transfer document so the next session resumes without re-reading history.
**Version**: 1.0.0 | **Effort**: low

## Identity

session-handoff is a hookforge skill that summarizes the current session's work into a compact structured document that a future session or different agent can use to continue without reading the full conversation history.

**Example:** `/do I need to pause this work` → handoff doc listing what's done, what's next, and the exact files to read to resume

## When to Use

- When approaching context limits and need to continue in a new session
- Before ending a long session to preserve state for the next
- When `/do` routes "handoff" or "save context"

## Orientation

Context is expensive. A handoff that forces the next session to re-read 40K tokens to find the current state is worse than no handoff. Target: the next session needs only the handoff document to continue correctly. A handoff is NOT a transcript - it is the minimum information needed to continue.

## Protocol

1. Identify the active campaign or task (check `.planning/campaigns/` or task list).
2. Write five structured sections:
   - **What was done this session** - bullet list, one line per item. Facts only, no narrative.
   - **Decisions made** - decision + one-sentence rationale each. Only decisions the next session needs to respect.
   - **Files changed** - list with brief description of what changed and why.
   - **Current state** - status (complete/blocked/in-progress) and what is in-progress right now.
   - **What to do next** - the single most important next action (specific, not "continue the work"), plus up to 2 follow-on steps. **Blockers** (anything that prevented progress and what is needed to unblock).
3. Update the active campaign file's Continuation State section with the current phase, sub-step, and next-action (if campaign exists).
4. Write the handoff to `.planning/handoffs/YYYY-MM-DD-<session-slug>.md`.

## Quality Gates

- "What to do next" has a specific first action the next session can execute immediately
- Campaign continuation state updated (if campaign is active)
- No session-specific ephemera ("I was confused about X") - only durable facts
- Next session can resume without reading any prior conversation

## Exit Protocol

Write the handoff to `.planning/handoffs/YYYY-MM-DD-<slug>.md` using the five-section structure:
`What was done this session` / `Decisions made` / `Files changed` / `Current state` / `What to do next`.

If no active campaign, name the file `.planning/handoffs/YYYY-MM-DD-adhoc.md`.

Print the file path so the user can share it or reference it in the next session. The handoff document is the composition bridge between sessions -- other skills (`systematic-debugging`, `postmortem`) will read it to resume without re-reading the conversation. See `docs/skill-protocol.md` (Skill Composition section) for the full format spec.


Next skill: `create-skill` if the session established a reusable workflow pattern, or resume the active campaign skill from the "What to do next" section in the next session.