# Skill: scaffold

**Description**: Generate new files matching the project's naming conventions, folder structure, and code patterns.
**Version**: 1.0.0 | **Effort**: medium

## Identity

scaffold is a hookforge skill that creates new modules, components, or feature directories that match the project's existing conventions, using existing files as templates rather than generic boilerplate.

**Example:** `/do create a UserRepository class` → `src/repositories/UserRepository.ts` following the project's existing Repository pattern exactly

## When to Use

- When creating a new component, service, or module from scratch
- To ensure naming conventions and folder structure match the project
- When `/do` routes "scaffold" or "new file"

## Orientation

The worst scaffolding produces files the team immediately rewrites because they use the wrong import style, the wrong naming, or the wrong export shape. This skill avoids that by reading existing files first and matching their patterns exactly. The project's conventions always win over generic defaults.

## Protocol

1. Read CLAUDE.md and 2-3 representative files from the target directory to extract conventions: naming, import style, export pattern, file organization.
2. Identify the expected test co-location: does this project use `__tests__/`, `.test.ts` alongside source, or a separate `test/` tree?
3. Determine the file type: module, component, adapter, service, utility, or command.
4. Write the new file(s) matching the extracted patterns exactly - not a generic template, but a file that looks like it belongs in this specific project.
5. If a test file is expected, scaffold it alongside with at least one placeholder test (imports pass, framework resolves).
6. Run typecheck to confirm the new file type-checks cleanly.
7. Report any conventions that could not be inferred and what default was used instead.

## Quality Gates

- New files typecheck with zero errors
- Naming follows project convention: casing, separator style, location in directory tree
- Import style matches existing files (path aliases, barrel imports, relative paths)
- Scaffolded test file (if any) has at least one test that runs

## Exit Protocol

List all files created and their paths. Run typecheck and report the result. Note any conventions that defaulted rather than being inferred.

Next skill: `create-app` - implement the scaffolded structure with real logic, or `doc-gen` to generate API docs for the new module.