# Skill: deploy

**Description**: Execute a structured deployment to a target environment with pre-flight checks and rollback readiness.
**Version**: 1.0.0 | **Effort**: medium

## Identity

deploy is a hookforge skill that guides a deployment from a committed and tested branch to a target environment (staging, preview, production), including pre-flight validation, deployment execution, smoke testing, and rollback readiness.

**Example:** `/do deploy to production` → pre-flight passed, deploy executed, smoke test `/health` returned 200, rollback script ready

## When to Use

- When a branch is ready to deploy to staging or production
- After all tests pass and the feature is complete and reviewed
- When `/do` routes "deploy" or "deployment"

## Orientation

A deployment is a high-risk operation: it changes live state in an environment shared by users or downstream systems. The deployment procedure must be repeatable, observable, and reversible. Never deploy without a known rollback path. Never deploy without confirming the artifact being deployed is the one that passed tests.

## Protocol

1. Identify the deployment target (staging / preview / production) and the artifact to deploy (git SHA, image tag, or package version).
2. Run pre-flight checks:
   - Confirm the artifact is built from a passing CI run (check CI status via `gh run list` or equivalent).
   - Confirm the current branch is clean and ahead of the target branch: `git status`, `git log origin/main..HEAD`.
   - Check that required environment variables are present in the target environment.
   - For production: confirm deployment is scheduled during a maintenance window or low-traffic period.
3. Execute deployment using the project's deployment command (check `package.json` scripts, `Makefile`, `Dockerfile`, or CI config for the canonical deploy command).
4. Monitor deployment progress: tail logs, watch health check endpoint, check platform dashboard.
5. Run smoke tests immediately after deployment:
   - Hit the health endpoint: `curl -sf <base-url>/health` or equivalent.
   - Verify critical paths (login, primary API endpoint, database connectivity).
6. If any smoke test fails: execute rollback immediately (see Quality Gates).
7. Record the deployment: commit SHA, environment, timestamp, operator, outcome.

## Quality Gates

- Pre-flight CI check passes before any deploy command runs
- Rollback command is documented and tested before production deploy
- Smoke tests run within 2 minutes of deployment completing
- Deployment record written (even for failed deployments)

## Exit Protocol

Report: environment deployed to, commit SHA deployed, smoke test results (pass count / fail count), and next recommended action. If smoke tests passed: suggest monitoring for 10 minutes before closing the deployment ticket. If smoke tests failed: report rollback initiated and what specifically failed.

Next skill: `postmortem` - if the deployment caused an incident, run a postmortem to capture what happened and prevent recurrence.