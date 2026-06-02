# Skill: commit-message

**Description**: Generate a conventional commit message from staged or unstaged changes.
**Version**: 1.0.0 | **Effort**: low

## Identity

commit-message is a hookforge skill that reads staged or unstaged diffs and produces a conventional commit message that explains WHY the change was made, not just WHAT changed.

**Example:** `/do write a commit message` → `feat(auth): add JWT refresh token rotation` with a WHY-focused body

## When to Use

- When staged changes are ready and you need a conventional commit message
- After any atomic change before `git commit`
- When `/do` routes "commit"

## Orientation

The diff already shows what changed. The commit message should capture the intent, the constraint being satisfied, or the problem being fixed. Commits that only restate the diff ("update button styles") are useless during bisect. Target: one-line subject, optional body for non-obvious motivation.

## Protocol

1. Run `git diff --cached`. If empty, run `git diff HEAD`.
2. Identify the primary change type: new capability not present before (`feat:`), fix for broken behaviour (`fix:`), restructuring without behaviour change (`refactor:`), test additions (`test:`), build or tooling change (`chore:`), documentation only (`docs:`).
3. Identify the scope (optional): the subsystem or package most affected (e.g., `auth`, `cli`, `contracts`).
4. Write the subject: `<type>(<scope>): <imperative verb> <what and why>`. Max 72 characters. Imperative mood: "add", "fix", "remove" - not past tense.
5. If the motivation is non-obvious (regulatory requirement, performance target, specific bug), add a body after a blank line explaining the constraint, not the mechanism.
6. Do NOT include: Co-Authored-By headers, "This commit" prefix, trailing period on subject, PR/issue references.
7. Output the message only - no surrounding prose or code blocks.

## Quality Gates

- Subject is 72 characters or fewer
- Subject uses an imperative verb (no "-ed" or "-ing" endings)
- No Co-Authored-By headers
- Type prefix is one of: feat, fix, refactor, test, chore, docs, perf, style, ci, build, revert

## Exit Protocol

Output the commit message verbatim, ready to pass to `git commit -m`. If staged changes span multiple logical concerns, output one message per concern and note that they should be split into separate commits.

Next skill: `code-review` - run a structured review before pushing if the change is non-trivial.