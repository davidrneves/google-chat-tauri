# Skill: code-review

**Description**: Execute a 5-pass structured code review covering correctness, security, performance, readability, and consistency.
**Version**: 1.0.0 | **Effort**: medium

## Identity

code-review is a hookforge skill that performs a structured 5-pass review of a file, directory, or git diff. Every finding is specific, located, and actionable - not a vague suggestion.

**Example:** `/do review auth.ts` → PASS/FAIL verdict with findings grouped by severity, each with file, line, and concrete fix

## When to Use

- Before merging a PR or opening one for review
- After a major refactor to catch regressions before pushing
- When `/do` routes "review", "audit", or "code check"

## Orientation

This skill finds problems that static analysis misses: logic errors, security holes, performance cliffs, and convention drift. Severity: CRITICAL = will cause bugs/security issues in production; WARNING = degrades under specific conditions or adds maintenance burden; INFO = style improvement.

## Protocol

1. Determine scope: file path, directory, or diff range. For diffs, read the full file for context around changed hunks.
2. Load conventions from CLAUDE.md, tsconfig.json, eslint config, or equivalent.
3. **Pass 1 - Correctness**: logic errors, off-by-one, null dereference, unhandled rejections, race conditions, type coercion bugs, resource leaks, edge cases (empty, zero, negative, large inputs).
4. **Pass 2 - Security**: injection (SQL/NoSQL/cmd/template), XSS (innerHTML, dangerouslySetInnerHTML), auth gaps, hardcoded secrets, unsafe deserialization (eval, Function), SSRF, path traversal, insecure crypto.
5. **Pass 3 - Performance**: O(n^2) in scalable paths, allocations in hot loops, missing memoization, N+1 queries, oversized imports, unbounded queries, ReDoS regex.
6. **Pass 4 - Readability**: vague names, functions over 50 lines, 3+ nesting levels, dead code, misleading comments, magic values without constants.
7. **Pass 5 - Consistency**: import style, error handling pattern, file organization, API patterns, naming conventions - against project conventions and internal consistency.
8. For each finding: file, line, severity, one-sentence description, snippet, concrete fix (never "consider" without a specific action).
9. Count findings. Verdict: PASS (0 critical, <=3 warnings), CONDITIONAL (0 critical, >3 warnings), FAIL (any critical).

## Quality Gates

- Every finding has file, line, severity, description, and fix
- No false positives from skimming (verify in surrounding context before reporting)
- Severity calibrated: style nits are never CRITICAL, injections are never INFO
- Line numbers verified against actual file content

## Exit Protocol

Output findings grouped by pass. State verdict (PASS/CONDITIONAL/FAIL) with counts by severity. Do not offer to fix anything unless asked.

Next skill: `refactor` (if CONDITIONAL/FAIL findings require structural changes), or `test-gen` (if coverage gaps were flagged in the review).