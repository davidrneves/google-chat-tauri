# Skill: test-gen

**Description**: Generate test cases in the Arrange-Act-Assert pattern matched to the project's test framework.
**Version**: 1.0.0 | **Effort**: medium

## Identity

test-gen is a hookforge skill that reads a source file and generates a matching test file using the project's test framework, following the AAA pattern and the project's existing test conventions.

**Example:** `/do write tests for PaymentService` → `PaymentService.test.ts` with 8 tests in Arrange-Act-Assert format, all passing

## When to Use

- After implementing a function, class, or module with no existing tests
- When coverage drops below threshold or a gap is identified by the linter
- When `/do` routes "generate tests" or "write tests"

## Orientation

The goal is tests that run and catch regressions - not coverage theatre. Priority order: (1) happy path for each exported function, (2) boundary conditions, (3) error paths. A test that exercises a real constraint is worth ten that check trivial returns.

Match the project's existing test style exactly: import syntax, describe/it/test, assertion library, mock patterns.

## Protocol

1. Detect the test framework from package.json devDependencies: jest, vitest, mocha, jasmine, or @testing-library.
2. Read the target source file in full.
3. Read an existing test file from the same package to capture the project's test style. If none exists, use the detected framework's defaults.
4. Identify testable units: exported functions, class methods, error conditions, edge cases.
5. For each testable unit, write one test per scenario following AAA:
   - **Arrange**: set up inputs, mocks, and state
   - **Act**: call the unit under test
   - **Assert**: verify output, side effects, or thrown errors
6. Use the mock pattern from existing tests. If none: jest.mock/vi.mock/sinon.stub as appropriate for the framework.
7. Name tests descriptively: "returns null when input is empty" not "test 1".
8. Do not test implementation details (private methods, internal state). Test observable behaviour.
9. Write to `<source>.test.ts` or `.spec.ts` matching the project convention.
10. Run the test command to verify all generated tests pass.

## Quality Gates

- All generated tests pass when run
- At least one test covers the happy path for each exported function
- At least one test covers an edge case or error path per function
- Test names describe the scenario, not the function name
- No commented-out test bodies

## Exit Protocol

Output the test file path and count of tests generated. Report any that fail to run with the error message. If the source file has untestable patterns (private-only API), note them.

Next skill: `code-review` - verify the tests are well-structured and the coverage gaps are closed.