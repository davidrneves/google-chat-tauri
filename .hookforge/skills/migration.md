# Skill: migration

**Description**: Plan, write, and safely apply a database or schema migration with rollback.
**Version**: 1.0.0 | **Effort**: medium

## Identity

migration is a hookforge skill that guides the full lifecycle of a database or schema change: designing the migration, writing the up and down scripts, validating against existing data, applying safely in production, and documenting the rollback procedure.

**Example:** `/do add a soft-delete column to users` → migration up/down scripts, backfill plan for existing rows, rollback procedure documented

## When to Use

- When a database schema needs a new column, renamed table, or dropped constraint
- Before deploying any change that requires a data migration step
- When `/do` routes "migrate", "migration", or "schema change"

## Orientation

Schema migrations are the most dangerous class of change: they can corrupt data, lock tables under load, or silently truncate values. Every migration must be reversible, tested against real data volumes, and applied with a rollback plan confirmed before the first row changes.

## Protocol

1. Identify the change: what table/collection/index is changing, and why. Read the current schema from migration files (Alembic, Flyway, Prisma, ActiveRecord, or raw SQL).
2. Classify risk:
   - **Low risk**: adding a nullable column, adding an index with CONCURRENTLY, adding a new table.
   - **Medium risk**: renaming a column (requires two-phase migration: add + copy + remove), changing column type with widening cast.
   - **High risk**: removing a column, changing column type with narrowing cast, dropping a table, adding a NOT NULL constraint to an existing column.
3. For medium/high risk: write the migration in two phases (expand then contract) to maintain backwards compatibility during the deployment window.
4. Write the `up` migration and the `down` (rollback) migration. Test `down` against the result of `up` on a copy of the schema.
5. Estimate migration time on production data volume:
   - For table scans on large tables: estimate rows × per-row cost, check if a table lock is acquired.
   - If estimated time > 30 seconds: use a batched approach or CONCURRENTLY index creation.
6. Write a dry-run script that verifies the migration can be applied and rolled back on a staging database.
7. Document the rollback procedure: exact commands, expected runtime, and how to verify rollback success.

## Quality Gates

- `down` migration reverses `up` exactly (schema diff before up == schema diff after down)
- High-risk migrations have explicit row-count and lock-time estimates
- Migration tested on staging before production
- Rollback procedure documented and reviewed before production apply

## Exit Protocol

Output: migration file path, risk classification, estimated runtime, rollback procedure, and the exact commands to apply (up) and reverse (down). Flag any migration that holds a table lock for > 5 seconds as requiring a deployment window.

Next skill: `deploy` - apply the migration as part of a structured deployment.