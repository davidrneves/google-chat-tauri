# Skill: release

**Description**: Prepare and publish a release: changelog, version bump, git tag, and release notes.
**Version**: 1.0.0 | **Effort**: low

## Identity

release is a hookforge skill that prepares a versioned release from the current branch: summarises changes since the last tag, bumps the version, updates the changelog, creates a git tag, and drafts release notes for publishing.

**Example:** `/do cut v1.2.0` → version bumped in `package.json`, CHANGELOG updated with 8 entries, git tag pushed, release notes drafted

## When to Use

- When a feature branch is ready to ship and needs a versioned release
- To generate a CHANGELOG entry, bump the version, and create a git tag
- When `/do` routes "release" or "ship"

## Orientation

A release is a point-in-time snapshot of the codebase that users can depend on. The version number and changelog are the public contract. They must be accurate, complete, and consistent. A release that omits breaking changes or increments the wrong semver segment erodes user trust.

## Protocol

1. Determine the current version: read `version` from `package.json`, `pyproject.toml`, or `Cargo.toml`. If no manifest, read the most recent git tag (`git describe --tags --abbrev=0`).
2. List changes since the last release: `git log <last-tag>..HEAD --oneline --no-merges`. Group by conventional commit type: breaking changes (BREAKING or feat! or fix!), features (feat:), fixes (fix:), others.
3. Determine the next version using semver:
   - Any BREAKING change → major bump
   - Any `feat:` without breaking → minor bump
   - Only `fix:`, `chore:`, `docs:` → patch bump
4. Update the version in the manifest file(s).
5. Update `CHANGELOG.md`:
   - Add a new section: `## [x.y.z] - YYYY-MM-DD`
   - List breaking changes, features, and fixes under labelled sub-sections.
   - Keep entries concise: one line per commit, link to PR if available.
6. Commit the version and changelog: `git commit -m "chore: release vx.y.z"`.
7. Tag the release: `git tag -a vx.y.z -m "Release vx.y.z"`.
8. Output the draft release notes for the GitHub/GitLab release page.

## Quality Gates

- Version follows semver strictly (no "v" prefix in manifest, "v" prefix on git tag)
- Breaking changes listed explicitly in changelog
- Tag points to the version-bump commit, not an earlier commit
- `CHANGELOG.md` has a link to compare with previous version

## Exit Protocol

Print the release summary: version bumped from X to Y, N commits included, tag created. Output the draft release notes body. Remind: push the tag with `git push origin vx.y.z` and the branch with `git push origin main`.

Next skill: `deploy` - release a new version without deploying it to production.