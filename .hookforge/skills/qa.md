# Skill: qa

**Description**: Browser-based QA verification. Launches a real browser, navigates the app, clicks buttons, fills forms, and tests user flows. Works standalone or as a phase end condition in campaigns. Requires Playwright.
**Version**: 1.0.0 | **Effort**: high
**Requires**: browserPlaywright

## Identity

qa tests the app the way a user would: launching a browser, navigating pages, clicking buttons, filling forms, and verifying interactions. Screenshots catch visual bugs; qa catches interaction bugs.

**Example:** `/do test the checkout flow` → 7 steps exercised in a real browser; 1 bug found (cart clears on back navigation); screenshot attached

## Dependency: Playwright

**If Playwright is installed:** full browser QA works.
**If NOT installed:** fall back to live-preview (screenshot-only) or offer to install.

Detection:
```bash
bunx playwright --version 2>/dev/null
```

Installation (if user agrees - always ask first):
```bash
bun add -D playwright && bunx playwright install chromium
```

Only installs Chromium (smallest download, ~150MB).

## When to Use

- After building a feature (verify it works in a browser)
- As a phase end condition: "QA verification passes for {flow}"
- After live-preview shows something renders but you need to verify interactions
- When do routes "qa", "test the app", "does it work", "click through it"

## Protocol

### Step 1: DISCOVER

1. Read project routes/pages (file tree, router config, package.json scripts)
2. Read PRD or campaign file for expected user flows
3. Identify testable flows:
   - Page loads and renders
   - Navigation between pages
   - Form submissions
   - Button click handlers
   - Auth flows (login, logout, protected routes)
   - CRUD operations
   - Error states

If no PRD/campaign: ask "What should I test? Give me 1-3 user flows."

### Step 2: START THE APP

1. Check if dev server is running: `curl -s localhost:3000` (also try 5173, 8080, 4173)
2. If not running: check package.json for dev/start scripts, start it in background
3. Wait for server to be ready (poll health endpoint or main URL, timeout 30s)
4. If server won't start: report the error and stop. Don't test a broken app.

Track whether the agent started the server. If so, kill it on completion.

### Step 3: TEST

For each flow, write and run a Playwright script:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate
  await page.goto('http://localhost:3000');

  // Verify page loaded
  const title = await page.title();

  // Test interactions
  await page.click('button[data-testid="submit"]');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Verify result
  const successMsg = await page.textContent('.success-message');

  // Screenshot for evidence
  await page.screenshot({ path: '.planning/screenshots/qa-flow-{N}.png' });

  await browser.close();
})();
```

For each test:
- Navigate to the relevant page
- Perform the user action (click, fill, submit)
- Verify the expected outcome (element appears, text changes, navigation occurs)
- Take a screenshot as evidence
- Log: PASS or FAIL with description

### Step 4: REPORT

Write results to `.planning/qa-report-{YYYY-MM-DD}.md`:

```markdown
# QA Report: {App Name or Feature}

> Date: {ISO date}
> Flows tested: {N}
> Passed: {N} | Failed: {N} | Skipped: {N}
> Screenshots: .planning/screenshots/qa-*.png

## Results

### Flow 1: {description}
- Steps: {what was done}
- Expected: {what should happen}
- Actual: {what did happen}
- Result: PASS / FAIL
- Screenshot: {path}
- Notes: {any observations}
```

### Step 5: CAMPAIGN INTEGRATION

When running as a phase end condition, the campaign file specifies QA conditions:
```
| 3 | qa_verify | /qa passes for: add item, update item, delete item |
```

qa reads the condition, runs those specific flows, and reports pass/fail. The phase is complete only if all specified flows pass.

## Auth Support

For apps with authentication:
1. Run the auth flow first: navigate to login, fill credentials, submit
2. Save the browser context (cookies + localStorage state)
3. Use saved context for all subsequent tests
4. Test credentials from `.env.example` or campaign file only. NEVER read from `.env`.

## No Playwright Fallback

If Playwright isn't installed and user declines:
1. Fall back to live-preview (screenshot-only)
2. Report: "Browser QA unavailable (Playwright not installed). Visual verification only."
3. Take screenshots of each page that would have been tested
4. Mark interaction tests as SKIPPED

## Fringe Cases

- **Playwright not installed, user declines**: Fall back to live-preview. All interaction tests SKIPPED in report.
- **Dev server won't start**: Report startup error, stop. Don't test a dead server.
- **No discoverable routes**: Ask for 1-3 flows explicitly.
- **API-only project**: "No UI detected - /qa requires a browser-accessible interface. Use typecheck and unit tests for API verification."
- **`.planning/screenshots/` missing**: Create it before saving screenshots.

## Quality Gates

- Every tested flow has all fields filled (steps, expected, actual, result)
- Screenshots taken for every flow (pass or fail)
- Failed flows have enough detail to reproduce the issue
- App is running before tests execute
- Never read from `.env` - use `.env.example` or test credentials
- **Degraded mode (browserPlaywright unavailable):** Mark all interaction tests SKIPPED. Fall back to live-preview (screenshot-only verification). Offer: `bun add -D playwright && bunx playwright install chromium`

## Exit Protocol

```
---HANDOFF---
- QA Report: .planning/qa-report-{date}.md
- Flows tested: {N}
- Passed: {N} | Failed: {N} | Skipped: {N}
- Screenshots: .planning/screenshots/qa-*.png
- Server: started by agent (killed) | was already running (left running)
---
```

Next skill: `verify` - run the full acceptance criteria checklist after a passing QA report, or `systematic-debugging` if QA uncovered failures.