# Skill: live-preview

**Description**: Mid-build visual verification loop. Takes screenshots of components during construction, not just after. Catches visual regressions and invisible features before they compound. Requires Playwright.
**Version**: 1.0.0 | **Effort**: low
**Requires**: browserPlaywright

## Identity

live-preview catches the gap between "compiles" and "works visually." It takes screenshots during construction so you don't ship invisible features or broken layouts.

This exists because of a real failure pattern: an agent completes a multi-phase campaign, passes every typecheck, and ships a feature where most entities are invisible. Exit code 0 is not quality.

**Example:** `/do show me the current UI` → screenshot of the dashboard plus analysis: nav missing on mobile, form labels cut off at 375px

## When to Use

- Any time `.tsx`, `.jsx`, `.vue`, `.svelte`, or `.html` files are modified
- After component creation or replacement
- During visual redesign campaigns
- When archon or marshal delegate UI work

## Protocol

### Step 1: DETECT

1. Check which files were modified in the current session/phase
2. Filter to view-layer files: `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css`
3. If no view-layer files: exit with "No view-layer files modified. Nothing to preview." (expected for non-UI repos - CLI tools, libraries, agent harnesses)
4. Map each modified file to a route or URL where it renders:
   - Use route manifest or sitemap if available
   - Read router config to identify which routes render each component
   - If route is unclear: ask the user

### Step 2: CAPTURE

For each route that needs verification:

1. Ensure dev server is running (start if not, read package.json scripts for dev/start)
2. Take a screenshot:
   ```bash
   bunx playwright screenshot http://localhost:{port}/{route} .planning/screenshots/{route-slug}.png --full-page
   ```
3. If Playwright isn't available:
   - "live-preview needs Playwright for screenshots. Install with: bun add -D playwright && bunx playwright install chromium"
   - Fall back to degraded mode (see frontmatter)

### Step 3: VERIFY

For each screenshot (read it visually):

- Does the component render? (not blank, not invisible)
- Does it show real data or placeholder/empty states?
- Are there obvious layout breaks (overlapping elements, overflow, missing sections)?
- Does it match the intended design direction?

Record:
- PASS: renders correctly, matches expectations
- FAIL: describe what's wrong
- BLANK: nothing rendered (critical failure)

### Step 4: FIX (if failures found)

For each FAIL or BLANK:

1. Diagnose: data issue, rendering issue, or missing import?
2. Fix the root cause (not a band-aid)
3. Re-capture and re-verify
4. Maximum 2 fix attempts per component. If still failing: log it and move on.

### Step 5: ARTIFACT

Save verification artifacts:

1. Screenshots to `.planning/screenshots/{campaign-slug}/` (if in a campaign) or `.planning/screenshots/` (standalone)
2. Write a verification summary:
   ```markdown
   ## Visual Verification: {date}

   | Route | File Modified | Result | Notes |
   |-------|--------------|--------|-------|
   | /dashboard | Dashboard.tsx | PASS | Renders correctly |
   | /settings | SettingsPanel.tsx | FAIL -> PASS | Fixed missing import |
   | /profile | ProfileCard.tsx | BLANK -> PASS | Component wasn't mounted, fixed export |
   ```

## Integration with archon

When archon delegates a build phase that modifies view files:

1. After the sub-agent completes, archon invokes live-preview on the modified routes
2. If any route is BLANK or FAIL, the phase is NOT marked complete
3. Fix cycle runs before proceeding to the next phase

## Common Invisible-Component Patterns

(Most common causes of BLANK results)

- Missing export (default or named export not present)
- Component not mounted (missing entry point, lazy load not resolved)
- Data not connected (component renders but data prop is undefined)
- CSS `display: none` or `visibility: hidden` mistakenly applied
- Z-index issue (element rendered behind another)
- Wrong import path (import fails silently, component placeholder rendered)

## Fringe Cases

- **Dev server not running**: "Dev server not detected on localhost:{port}. Start with `bun run dev`, then re-run." Do not attempt screenshots against a dead server.
- **Port not 3000**: Check 3001, 5173, 4173, 8080 before asking. Read package.json for `--port` flag.
- **Playwright not installed**: Output what to check manually - list modified routes, describe what each should render, suggest install command. Exit gracefully.
- **`.planning/screenshots/` missing**: Create the directory before writing artifacts.
- **No view-layer files modified**: Exit immediately. This is correct for non-UI repos.

## Quality Gates

- Every modified view file must have a corresponding screenshot (or VISUAL-UNVERIFIED note if Playwright unavailable)
- BLANK results are critical failures
- Screenshots must be saved as artifacts
- Fix attempts capped at 2 per component
- **Degraded mode (browserPlaywright unavailable):** Log all visual checks as VISUAL-UNVERIFIED. Describe expected rendering from source code analysis instead of screenshots. Offer: `bun add -D playwright && bunx playwright install chromium`

## Exit Protocol

```
---HANDOFF---
- Live Preview: {N} routes verified
- Results: {pass}/{total} passed
- Failures: {list of routes that failed and what was wrong}
- Screenshots: .planning/screenshots/{path}
---
```


Next skill: `qa` for a full browser test pass after visual verification, or `refactor` to fix layout issues found.