# Skill: triage

**Description**: GitHub issue and PR investigator. Pulls open issues and PRs, classifies them, searches the codebase for root cause, proposes fixes with file:line references, and optionally implements fixes. Handles both issues and pull requests.
**Version**: 1.0.0 | **Effort**: high
**Requires**: githubApi

## Identity

triage investigates GitHub issues and reviews incoming PRs with the rigor of a senior engineer doing root cause analysis - not a bot that pastes template responses.

**Example:** `/do process open GitHub issues` → 8 issues triaged: 3 confirmed bugs with repros, 4 feature requests labeled, 1 duplicate closed

## When to Use

- `/triage` - triage all open, unlabeled issues
- `/triage 10` - investigate issue #10
- `/triage pr 13` - review PR #13
- `/triage prs` - review all open PRs
- `/triage --batch` - classify and investigate all open issues
- `/triage --stale` - find issues older than 14 days with no activity

## Protocol

### Phase 0: ENVIRONMENT SETUP

1. Detect the GitHub repo from `git remote get-url origin`
2. Extract `owner/repo` from the remote URL
3. Verify `gh` auth status: `gh auth status`
4. If gh not available or not authenticated: output "Run `gh auth login` before using /triage." Stop.

### Phase 1: ISSUE INTAKE

**Single issue** (`/triage 10`):
```bash
gh issue view <number> --repo <owner/repo> --json number,title,body,labels,state,comments,createdAt,updatedAt,author,assignees
```

**Batch** (`/triage` or `--batch`):
```bash
gh issue list --repo <owner/repo> --state open --json number,title,labels,createdAt,updatedAt --limit 50
```
Filter to untriaged: issues with no labels or missing a priority/type label.

**Stale** (`--stale`):
```bash
gh issue list --repo <owner/repo> --state open --json number,title,labels,createdAt,updatedAt --limit 100
```
Filter to issues with no activity in 14+ days.

**Single PR** (`/triage pr 13`):
```bash
gh pr view <number> --repo <owner/repo> --json number,title,body,author,state,files,commits,comments,createdAt,headRefName,baseRefName,mergeable,reviewDecision
gh pr diff <number> --repo <owner/repo>
```

**All PRs** (`/triage prs`):
```bash
gh pr list --repo <owner/repo> --state open --json number,title,author,createdAt,labels --limit 50
```

### Phase 1b: PR REVIEW

1. Read the full diff. Not just the PR description.
2. Check for regressions against recent commits.
3. Check for conflicts with other in-flight PRs.
4. Verify the approach is correct and appropriately scoped.
5. Check conventions against CLAUDE.md or project rules.

Produce structured review:
```markdown
## PR #{N}: {title}

**Author:** {username}
**Type:** bugfix | feature | refactor | docs | infra
**Files changed:** {N}

### What it does
{1-3 sentences}

### Review findings
- {finding with file:line reference}

### Issues found
- **Critical:** {blocks merge}
- **Non-critical:** {nice to fix}

### Recommendation
- [ ] Approve
- [ ] Request changes: {specific changes}
- [ ] Close: {reason}
```

**All PR actions are external.** Show the user the comment text and get approval before posting.

### Phase 2: CLASSIFICATION

**Type**: bug | feature | question | docs | infra

**Severity** (bugs only): critical | high | medium | low

**Component**: map to project area (adapters, skills, hooks, config, etc.)

### Phase 3: INVESTIGATION

1. Parse error messages, stack traces, environment details from issue body.
2. Search the codebase: grep for error text, read referenced files, check git log for related changes.
3. For bugs: determine root cause (what breaks, why, when introduced, who affected, what the fix is).
4. For features: is it already possible? Where would it go? Effort?

### Phase 4: RESOLUTION PLAN

```markdown
## Issue #{N}: {title}

**Type:** bug | feature | question | docs | infra
**Severity:** critical | high | medium | low
**Component:** {file or area}
**Reproducible:** yes | no

### Root Cause
{1-3 sentences explaining WHY}

### Affected Code
- `{file}:{line}` - {what's wrong}

### Proposed Fix
{Specific code changes, not "update the code"}

### Recommended Action
- [ ] Fix in next release
- [ ] Needs more info
- [ ] Won't fix: {reason}
```

### Phase 5: ACTION

**Auto-fix** (when root cause is clear, fix is 1-3 files, no breaking changes):
1. Branch: `fix/issue-{number}-{slug}`
2. Implement fix
3. Run typecheck/build
4. Commit: `fix: {description} (closes #{number})`
5. Push, open PR linking the issue

**Comment with findings**: post structured comment, add labels.

**Label only**: for questions, docs, features.

### Phase 6: REPORT

```
## Triage Summary

| # | Title | Type | Severity | Action | Status |
|---|-------|------|----------|--------|--------|
| 10 | {title} | bug | high | Auto-fixed -> PR #11 | Done |
```

## Quality Gates

- Every investigated issue has a classification
- Every bug has a root cause with file:line references
- Every auto-fix passes typecheck
- No issue left without at least a label or comment

## Exit Protocol

```
---HANDOFF---
- Triaged {N} issues: {X} bugs, {Y} features, {Z} questions
- Auto-fixed: {list with PR links}
- Needs attention: {list requiring human decision}
---
```

Next skill: `systematic-debugging` to investigate a failing issue in depth, or `pr-watch` to monitor and auto-fix a failing PR.