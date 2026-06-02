# Skill: infra-audit

**Description**: Maps current infrastructure from config files. Reads docker-compose, .env.example, ORM configs, and CI workflows to produce a structured infrastructure manifest. Flags misconfigs, exposed secrets patterns, and missing observability.
**Version**: 1.0.0 | **Effort**: medium
**Requires**: mcp

## Identity

infra-audit reads project configuration files to map the current infrastructure: what databases it connects to, what services it depends on, how it deploys, and what's observable. It does NOT modify infrastructure — it produces a manifest and a prioritized list of improvement opportunities.

**Example:** `/do what does this app connect to?` → infra map: PostgreSQL (prod), Redis (cache), S3 (uploads), Stripe; 2 unmonitored services flagged

## When to Use

- When joining an unfamiliar codebase
- Before a security review or compliance audit
- Before adding a new service or database
- When something broke in production and you need the full dependency map
- Periodic hygiene check on config drift

## Protocol

### Step 1: DISCOVER CONFIG FILES

Scan for infrastructure configuration:

```
docker-compose.yml, docker-compose.*.yml
.env.example, .env.template, .env.sample
Dockerfile, Dockerfile.*
k8s/*.yaml, kubernetes/*.yaml
terraform/*.tf
.github/workflows/*.yml, .circleci/config.yml
**/prisma/schema.prisma, **/drizzle.config.ts
**/database.yml, **/database.json
**/knexfile.ts, **/knexfile.js
package.json (for service scripts and dependencies)
fly.toml, railway.toml, render.yaml, vercel.json
```

Do NOT read `.env` files (actual secrets). Read `.env.example` or `.env.template` only.

### Step 2: PARSE AND MAP

From discovered files, extract:

**Services**: every named service in docker-compose or k8s manifests. For each: image, port bindings, volume mounts, environment variables (names only, not values).

**Databases**: every database reference (connection strings pattern-matched from `.env.example`, ORM schema files, docker-compose service types). Extract: type (postgres/mysql/mongo/redis/etc.), name, host pattern.

**External dependencies**: every external API, service, or cloud provider referenced (AWS, Stripe, SendGrid, etc.). Look in `.env.example` keys and CI environment variable declarations.

**CI/CD pipeline**: deployment targets, environments (staging/prod), secrets referenced in workflows.

**Observability**: presence or absence of logging library, error tracking (Sentry, Datadog, etc.), APM, health check endpoints.

### Step 3: GENERATE MANIFEST

Write to `.planning/infra-manifest-{YYYY-MM-DD}.md`:

```markdown
# Infrastructure Manifest: {Project Name}

> Generated: {ISO date}
> Confidence: {high | medium | low} — {reason}

## Services

| Service | Image | Port | Role |
|---|---|---|---|
| {name} | {image} | {port} | {web | db | cache | queue | ...} |

## Databases

| Type | Name | Used for | ORM/Driver |
|---|---|---|---|
| postgres | {name} | {purpose} | prisma |
...

## External Dependencies

| Service | Purpose | Credentials in |
|---|---|---|
| AWS S3 | File storage | AWS_* env vars |
...

## CI/CD

| Environment | Deploy target | Trigger |
|---|---|---|
| production | {target} | push to main |
...

## Observability

| Concern | Tool | Status |
|---|---|---|
| Error tracking | Sentry | configured |
| Logging | console.log | missing structured logging |
| Health checks | none | MISSING |
...

## Improvement Opportunities

### HIGH

1. {Specific finding with file reference and recommended fix}

### MEDIUM

2. {Finding}

### LOW

3. {Finding}
```

### Step 4: FLAG ISSUES

Scan for common infrastructure problems:

**Security:**
- `.env.example` contains real-looking secrets (not placeholder values like `your-key-here`)
- `DEBUG=true` or `NODE_ENV=development` in docker-compose for prod-labeled services
- Database port 5432/3306/27017 bound to `0.0.0.0` instead of `127.0.0.1`
- JWT secrets or API keys hardcoded in config files (not just referenced)

**Reliability:**
- No health check defined for web service in docker-compose
- No restart policy on critical services
- Volumes not defined for database containers (data lost on container restart)

**Observability:**
- No structured logging (only `console.log`)
- No error tracking service configured
- No health check endpoint in application code

**Operational:**
- Missing `docker-compose.override.yml` for local dev overrides
- No documented migration strategy (ORM present but no migration runner in docker-compose)
- CI deploys directly to production without a staging step

### Step 5: PRESENT

Show the user:
1. Summary: "{N} services, {M} databases, {K} external dependencies"
2. Top 3 HIGH findings with recommended fixes
3. Link to the full manifest

## Quality Gates

- Never read actual `.env` files — only `.env.example`, `.env.template`, `.env.sample`
- Confidence level MUST be "low" if fewer than 3 config files were found
- File references must be exact paths, not approximations
- Do not flag Docker Desktop port conflicts as security issues

## Exit Protocol

Output: "Infra audit complete. {N} services, {M} databases, {K} external dependencies mapped. {P} HIGH, {Q} MEDIUM findings. Manifest at `.planning/infra-manifest-{date}.md`."

Next skill: `architect` to plan changes based on the infrastructure map, or `research` to investigate the impact of identified improvement areas.