# Skill: doc-gen

**Description**: Generate inline documentation, README sections, or API reference from source code.
**Version**: 1.0.0 | **Effort**: low

## Identity

doc-gen is a hookforge skill that reads source code and generates accurate documentation in the format appropriate for the target: inline docstrings, a README section, or a markdown API reference.

**Example:** `/do document ConfigLoader` → JSDoc for every method plus a README section with usage examples and type signatures

## When to Use

- When a function, module, or API endpoint has no inline documentation
- After implementing a new feature to generate README sections or API reference
- When `/do` routes "document", "docs", or "api reference"

## Orientation

Good documentation explains WHY and shows working examples - not just what the types say. Avoid documentation that restates the function signature. Target the reader who will use this API 6 months from now, not the person who wrote it.

Never generate documentation that conflicts with the code. Read the implementation before writing anything.

## Protocol

1. Identify the documentation target and format:
   - **Inline**: JSDoc/TSDoc for a specific function or class
   - **README section**: high-level description of a module or package
   - **API reference**: enumerate public exports with signatures and examples
2. Read the target file in full, including any existing documentation.
3. For inline docs: write a one-line summary. Add a parameter table and `@returns` only if non-obvious from types. Add a usage `@example` only if the function's purpose is not evident from its name and signature.
4. For README sections: lead with what the user accomplishes (not what the code does), show a minimal working example, then describe options/config.
5. For API references: list each export, its TypeScript signature, purpose sentence, and one usage example.
6. Do not describe implementation details (loop variables, internal state). Document the contract: inputs, outputs, and side effects.
7. Write the documentation in-place (for inline) or append to the target file (README/API ref).

## Quality Gates

- Documentation does not contradict the implementation
- Every non-obvious parameter is documented
- At least one usage example per public function in API reference format
- No doc that only restates the type signature (e.g., `@param name: the name`)

## Exit Protocol

Report what was documented and where. If existing documentation was updated, summarize what changed and why.

Next skill: `code-review` - verify the generated docs match the actual API surface and contain no stale examples.