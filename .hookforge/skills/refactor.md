# Skill: refactor

**Description**: Execute safe multi-file refactoring with typecheck verification at each step and rollback checkpoints.
**Version**: 1.0.0 | **Effort**: medium

## Identity

refactor is a hookforge skill that restructures code without changing observable behaviour, with typecheck verification at each step and git checkpoints to enable rollback at any point.

**Example:** `/do extract the auth logic into its own module` → `auth/` directory with split files, all tests still passing, git checkpoint at each step

## When to Use

- When a symbol needs renaming across multiple files
- When extracting a function or module to reduce duplication
- When `/do` routes "refactor" or "rename"

## Orientation

A refactor that breaks tests or introduces type errors is not a refactor - it is a bug. This skill enforces: read before write, typecheck after every change, commit atomic checkpoints. Never mix feature work with refactoring in the same commit.

The smallest-diff discipline prevents scope creep: each step moves in one direction only (rename, extract, move, inline).

## Protocol

1. Understand scope: what is being renamed, extracted, moved, or inlined?
2. Create a checkpoint: `git stash push --include-untracked -m "pre-refactor-checkpoint"`.
3. Read all files in scope AND their callers (grep or LSP for usages). Confirm the blast radius before the first change.
4. Make the smallest change that moves in the right direction: rename one symbol, extract one function, move one module.
5. Run typecheck immediately: `bunx tsc --noEmit` (or project equivalent).
6. If typecheck passes: commit the step with a `refactor:` prefix message and continue.
7. If typecheck fails: fix the errors before proceeding. Do NOT accumulate errors - one step at a time.
8. Repeat steps 4-7 until complete.
9. Run the full test suite.
10. Confirm the public API surface is unchanged (unless that was the stated goal).

## Quality Gates

- Typecheck passes at every step (zero new errors at each step)
- Test suite passes at the end
- No behaviour changes (observable API unchanged unless explicitly requested)
- Each atomic step committed with `refactor:` prefix

## Exit Protocol

Report files changed, steps taken, typecheck status, and test results. If any step could not be resolved, restore from the checkpoint (`git stash pop`) and report what was attempted and where it failed.

Next skill: `test-gen` - add or update tests to confirm the refactored code behaves identically to the original.