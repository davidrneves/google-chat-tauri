# Skill: organize

**Description**: Three-pass directory structure scanner. Detects architecture violations, hygiene issues, and bloat. Generates a prioritized cleanup plan with specific move/rename/delete commands.
**Version**: 1.0.0 | **Effort**: medium

## Identity

organize audits the project's directory and file structure against its architectural conventions. It does NOT move files itself — it produces a prioritized, human-reviewable cleanup plan with exact shell commands.

**Example:** `/do is the project structure correct?` → 3 violations found: 2 files in wrong layer, 1 circular import; shell commands to fix each provided

## When to Use

- When the project feels "messy" or hard to navigate
- Before starting a large refactor (baseline the structure)
- When new contributors are confused about where things go
- Periodically as a hygiene check

## Protocol

### Step 1: READ CONVENTIONS

Determine the project's architectural rules from:

1. `CLAUDE.md` or `README.md` — explicit directory conventions
2. `.hookforge/harness.json` (if exists) — harness-specific config
3. The existing file tree — infer conventions from the dominant patterns

If no explicit conventions exist, use language-idiomatic defaults (e.g., TypeScript projects: `src/`, `tests/`, `docs/`).

### Step 2: SCAN (three passes)

**Pass 1: Architecture violations**

Files that are in the wrong layer or domain:
- Source files in the root directory (should be in `src/`)
- Test files mixed with source files (should be in `tests/` or co-located by convention)
- Config files buried in subdirectories (should be at root)
- Circular imports across layers (if importable via static analysis)
- Files whose names don't match their content (e.g., `utils.ts` with 800 lines of unrelated functions)

**Pass 2: Hygiene issues**

Technical debt that doesn't break builds but accumulates complexity:
- Files > 400 lines (likely need splitting)
- Duplicate filenames in different directories (likely redundant)
- TODO/FIXME/HACK comments in files (count and list top 5)
- Empty directories
- Uncommitted temporary files (`.bak`, `.tmp`, `_draft`, `_old`, `_backup`)
- Test files with no assertions (just `describe`/`it` blocks that are empty)

**Pass 3: Bloat**

Files and directories that probably shouldn't exist:
- Generated directories without a `.gitignore` entry (`dist/`, `build/`, `.next/`, `__pycache__/`)
- Lock files for multiple package managers (both `package-lock.json` and `bun.lockb` together)
- Large binary files committed to the repo (> 500KB, non-image assets)
- Log files committed to the repo (`.log`, error dumps)
- Multiple copies of the same dependency at different versions (if detectable via lockfile)

### Step 3: SCORE AND PRIORITIZE

Assign severity to each finding:

| Severity | Criteria |
|---|---|
| HIGH | Violates the project's stated architectural conventions; likely causes import errors or confusion |
| MEDIUM | Makes the project harder to navigate but doesn't break anything |
| LOW | Minor hygiene; fix when convenient |

Sort findings HIGH → MEDIUM → LOW within each pass.

### Step 4: GENERATE CLEANUP PLAN

For each finding, produce:
- **Problem**: what's wrong and where
- **Recommendation**: what to do
- **Command**: exact shell command to execute (use `mv`, `rm -rf`, `find`, `git rm`, etc.)
- **Risk**: what could break if the change is wrong (e.g., "update all imports to `src/utils`")

Write the plan to `.planning/organize-{YYYY-MM-DD}.md`.

### Step 5: PRESENT

Show the user:
1. A count summary: "{N} HIGH, {M} MEDIUM, {K} LOW issues found"
2. The top 3 HIGH items with commands
3. A link to the full plan

Ask: "Should I apply the HIGH severity fixes now, or do you want to review first?"

If the user says yes: apply HIGH fixes only, one by one, committing each atomically. Do NOT apply MEDIUM or LOW automatically.

If the user says review first: stop here. Full plan is in the file.

## Quality Gates

- Never delete files without showing the exact `rm` command to the user first
- Import path changes are HIGH risk — always note which files reference the moved file
- Do not flag intentional non-conventions (e.g., a monorepo root that deliberately mixes packages)
- Pass 3 (bloat) must check `.gitignore` before flagging generated directories

## Exit Protocol

Output: "Organize scan complete. {N} HIGH, {M} MEDIUM, {K} LOW issues. Plan written to `.planning/organize-{date}.md`."


Next skill: `doc-gen` to update documentation reflecting the new structure, or `refactor` to fix import paths broken by file moves.