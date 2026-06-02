# Skill: pr-watch

**Description**: Local PR auto-fix. Monitors CI status, automatically fixes failing checks by reading failure logs and applying targeted fixes, then optionally merges when all checks pass. Local terminal analog to cloud auto-fix features.
**Version**: 1.0.0 | **Effort**: high
**Requires**: githubApi

## Identity

pr-watch monitors a pull request's CI status, fixes failing checks by reading failure logs and applying targeted fixes, and optionally merges when all checks pass. Use it to stay in the terminal instead of switching to the web UI.

**Example:** `/do watch PR #42` → CI failure detected (missing env var), fix applied, CI re-ran green, PR auto-merged after approval

## When to Use

- When a PR has failing CI and you want the agent to monitor and fix automatically
- When waiting for a review and want pre-emptive CI conflict resolution
- When `/do` routes "pr-watch" or "monitor PR"

## Cloud Alternative

If the Claude GitHub App is installed, cloud auto-fix in Claude Code web or mobile is more resilient (survives machine sleep). To use it: open the PR in Claude Code web, enable "Auto fix". Use pr-watch for in-terminal sessions.

## Commands

| Command | Behavior |
|---|---|
| `/pr-watch` | Watch PR for current branch |
| `/pr-watch 42` | Watch PR #42 specifically |

## Protocol

### Phase 0: SETUP

1. Detect `gh` CLI:
   - Windows: `"/c/Program Files/GitHub CLI/gh.exe"`
   - Other: `gh`
   - If not authenticated: "gh CLI not authenticated. Run: `gh auth login`" and exit.
2. Detect repo from `git remote get-url origin`. Extract `owner/repo`.
3. Resolve PR number:
   - If argument provided: use it
   - Otherwise: `gh pr view --json number --jq '.number'`
   - If no PR: "No PR found for current branch. Create one first or pass a PR number." Exit.
4. Fetch PR details:
   ```bash
   gh pr view <number> --repo <owner/repo> --json number,title,url,headRefName,baseRefName,state,mergeable
   ```
5. Output: "Watching PR #N: {title}. Branch: {head} -> {base}. URL: {url}"
6. Initialize: `fix_attempts = 0`, `max_fix_attempts = 3`

### Phase 1: WATCH LOOP

Repeat until convergence or circuit break:

**Step 1.1: Fetch CI status**

```bash
gh pr checks <number> --repo <owner/repo>
```

Parse: check names, states (pass/fail/pending), detail URLs.

**Step 1.2: Evaluate**

| Condition | Action |
|---|---|
| All checks passing | Phase 2 (offer merge) |
| Any pending | "Waiting for checks... ({N} pending)". Wait 60 seconds. Loop. |
| Any failed | Step 1.3 (investigate and fix) |
| PR closed or merged | Exit: "PR #N is already closed/merged." |

**Step 1.3: Fix failing checks**

For each failed check:

1. Get the run ID:
   ```bash
   gh run list --repo <owner/repo> --branch <headRefName> --limit 5 \
     --json databaseId,status,conclusion,workflowName
   ```

2. Read failure logs:
   ```bash
   gh run view <run-id> --repo <owner/repo> --log-failed
   ```

3. Identify failure class:

| Failure class | Log signal | Fix strategy |
|---|---|---|
| TypeScript errors | `error TS` | Fix the specific TS errors in named files |
| Test failures | `FAIL`, assertion errors | Fix assertion or the code under test |
| Lint errors | `@typescript-eslint/`, `eslint` | Fix the specific violations |
| Build errors | `Cannot find module`, missing exports | Resolve imports, configs |
| Missing env/secrets | `undefined`, auth failures | Surface to user - not fixable from code |
| Infrastructure failure | Actions setup step failed, network | Surface to user - not fixable from code |

4. Apply minimum change to resolve the failing check. Do NOT refactor, expand scope, or fix unrelated issues. Run the check locally to verify before pushing.

5. Commit and push:
   ```bash
   git add <only changed files>
   git commit -m "fix: resolve CI failure - <check-name>"
   git push
   ```

6. Increment `fix_attempts++`

7. **Circuit breaker**: if `fix_attempts >= 3`:
   ```
   Circuit breaker triggered after 3 fix attempts on PR #N.

   Last failing check: {check-name}
   Log excerpt:
   {first 25 lines of failure log}

   Next steps:
   - Review the failure above and investigate manually
   - Run /pr-watch again after applying a manual fix
   ```
   Exit.

8. Wait 30 seconds. "Fix pushed - waiting for CI to re-run...". Loop to Step 1.1.

### Phase 2: MERGE OFFER

When all checks pass:

```
All checks passing on PR #N: {title}

Merge options:
  squash  - squash all commits into one (recommended for fix PRs)
  merge   - standard merge commit
  rebase  - rebase commits onto base branch
  skip    - leave the PR open (merge manually)
```

If merge strategy chosen:
```bash
gh pr merge <number> --repo <owner/repo> --<squash|merge|rebase> --delete-branch
```

## Circuit Breaker Rules

Trigger and stop when:
- `fix_attempts >= 3`
- A fix introduces a new failing check
- Failure is in infrastructure (not fixable from code)
- Failure log is empty or unreadable
- PR is closed or merged by someone else

## Anti-Patterns

- Never refactor while fixing CI - minimum viable fix only
- Never merge without asking
- Never retry the same fix approach if it already failed
- Never push directly to `main` or `master` - fixes go to the PR branch

## Fringe Cases

- **`gh` not installed**: give install instructions (cli.github.com)
- **PR already merged/closed**: exit cleanly
- **No CI checks configured**: note absence, offer to merge if user confirms
- **PR branch deleted**: exit with message

## Quality Gates

- Every fix is minimum-viable - no refactoring, cleanup, or unrelated changes while fixing CI
- Circuit breaker enforced: stop after 3 fix attempts regardless of remaining failures
- Never merge without explicit user confirmation, even when all checks are green
- Fixes committed only to the PR branch - never directly to main or master
- Each fix attempt logged with the check name, failure reason, and fix applied
- **Degraded mode (githubApi/gh unavailable):** Check CI status manually at the PR URL. Apply fixes locally, commit, and push. Circuit-breaker still applies (3 attempts max).

## Exit Protocol

```
---HANDOFF---
- Watched PR #N: {title}
- Fix attempts: {count} / 3
- Final status: green | circuit-break | user-exited | already-merged
- Checks resolved: {list}
- Checks still failing: {list, if circuit-break}
---
```


Next skill: `merge-review` once CI is green and the PR is ready to integrate with other branches.