# Skill: web-ui-debug

**Description**: Classifies web UI bugs by type, routes to research-backed investigation strategies per category, and verifies fixes with a generator-evaluator pattern using Playwright. Composes systematic-debugging, qa, and live-preview.
**Version**: 1.0.0 | **Effort**: high
**Requires**: browserPlaywright

## Identity

web-ui-debug encodes domain-specific knowledge about web UI debugging. It routes by bug category and provides concrete DevTools checklists.

Not a generic debugging skill - use `/systematic-debugging` for backend/API bugs, build errors, and type errors.

**Example:** `/do the modal isn't showing` → root cause: z-index conflict in `Modal.css`; fix: add `z-index: 1000` to `.modal-overlay`

## When to Use

- Visual bug, layout issue, or UI regression
- Keywords: "ui bug", "css bug", "layout broken", "visual bug", "render issue", "not rendering", "wrong style", "flickering", "slow interaction", "memory leak", "janky scroll"
- Working on `.css`, `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html` files with a bug
- After live-preview shows a FAIL or BLANK result

## Cognitive Load Management

Applied throughout all phases:

1. **Timebox**: Phase 1 max 2 minutes. Phase 2 max 15 minutes per hypothesis cycle.
2. **Context reset**: After 2 failed hypothesis cycles, STOP. Write a summary of what was tried. Re-read symptoms from scratch. Fixation on wrong hypotheses is common - forced fresh look breaks the cycle.
3. **Investigation journal**: Maintain running log at `.planning/debug-journal-{timestamp}.md` with every hypothesis tested and its result.

## Protocol

### Phase 1: CLASSIFY

**Step 1.1: Collect symptoms**

- Read the error message, console output, or user description
- If a running app exists (requires browserPlaywright):
  - Take a screenshot
  - Check browser console (errors)
  - Check network requests (failed requests)
- If no running app: work from description and source code

**Step 1.2: Classify into one of 7 categories**

| Category | Signals | Primary Tool |
|---|---|---|
| CSS/Layout | Invisible, misaligned, overlapping, wrong size, responsive fail | Elements > Computed, Box Model |
| JS Runtime | TypeError, ReferenceError, uncaught exception, crash | Sources > Breakpoints, Call Stack |
| Async/State | Race condition, stale data, wrong render, state not updating | XHR breakpoints, React DevTools |
| Performance | Slow interaction, janky scroll, high INP, layout thrashing | Performance panel |
| Memory Leak | Growing memory, page slower over time, detached DOM | Memory panel, Heap Snapshots |
| Visual Regression | "It used to look right", after-deploy change | Screenshot comparison |
| Cross-Browser | Works in Chrome but not Safari/Firefox, mobile-specific | Playwright multi-browser |

**Step 1.3: Output**

```
BUG TYPE: {category}
CONFIDENCE: high/medium/low
SIGNALS: {evidence pointing to this category}
FALLBACK: {secondary category if confidence < medium}
```

If the bug is NOT a web UI bug: delegate to `/systematic-debugging`.

### Phase 2: INVESTIGATE

Hypothesis-driven investigation with category-specific checklists.

**Common protocol across all categories:**

1. Form up to 3 hypotheses with evidence
2. Define a verification step for each (NO code changes yet - observe only)
3. Run verification, eliminate hypotheses
4. If none confirmed after 2 cycles: trigger context reset

---

#### CSS/Layout Checklist

- [ ] Inspect affected element in Elements panel
- [ ] Check Computed tab, Box Model - is width/height/padding/margin expected?
- [ ] Look for crossed-out styles (specificity conflicts, `!important` overrides)
- [ ] Force pseudo-states (`:hover`, `:active`, `:focus`) if bug involves interactions
- [ ] Enable "Emulate a focused page" if element disappears when DevTools opens
- [ ] Set DOM breakpoint on "attribute modifications" if JS dynamically changes classes
- [ ] Check responsive breakpoints with device emulation
- [ ] Run CSS Overview for unused declarations and contrast issues

#### JS Runtime Checklist

- [ ] Enable "Pause on Exceptions" in Sources panel
- [ ] Read the full Call Stack - trace back to origin of bad data
- [ ] Set conditional breakpoint at crash site (NOT console.log)
- [ ] Use Scope pane to inspect local/global variable values at breakpoint
- [ ] Set Watch expressions for suspected variables
- [ ] Blackbox third-party libraries (Sources > Ignore List)
- [ ] Run typecheck first - static analysis catches type mismatches

#### Async/State Checklist

- [ ] Set XHR/Fetch breakpoints for the relevant API endpoint
- [ ] Set Event Listener breakpoints if unsure which handler fires
- [ ] React: use Components tab to inspect current props/state
- [ ] React: use Profiler with "record why each component rendered"
- [ ] Use Logpoints (NOT console.log) to trace rapidly-changing state
- [ ] Check for stale closures: verify useEffect dependency arrays
- [ ] Set conditional breakpoint to pause when state reaches corrupted value

#### Performance Checklist

- [ ] Record a Performance trace during the slow interaction
- [ ] Check for Long Tasks (>50ms blocks on main thread)
- [ ] Check for Layout Thrashing: repeated read-write cycles
- [ ] Check INP (Interaction to Next Paint) metric
- [ ] Check for expensive paint: box-shadow, blurred backgrounds, dynamic fonts
- [ ] Check CLS (Cumulative Layout Shift) for visual instability
- [ ] Check Network Waterfall for blocking requests or high TTFB

#### Memory Leak Checklist

- [ ] Take Heap Snapshot #1 (baseline)
- [ ] Perform the suspected leaking action 5 times
- [ ] Take Heap Snapshot #2
- [ ] Compare snapshots - look for growing objects, especially detached DOM
- [ ] Use Allocation Timeline to track allocations without frees
- [ ] Check for unclosed event listeners, intervals, subscriptions

#### Visual Regression Checklist

- [ ] Take Playwright screenshot of current state
- [ ] Compare against previous known-good state (`.planning/screenshots/`)
- [ ] Check CSS Overview for recently introduced color/font/spacing changes
- [ ] Check git diff on CSS/style files for recent changes
- [ ] Test at multiple viewport sizes (375px, 768px, 1280px)

#### Cross-Browser Checklist

- [ ] Reproduce in Playwright across Chromium, Firefox, and WebKit
- [ ] Check for WebKit rendering differences (flex, grid, box model)
- [ ] Check for Safari-specific hidden DevTools (must enable manually)

---

**Phase 2 output:**

```
HYPOTHESIS CONFIRMED: {which one}
ROOT CAUSE: {the specific incorrect assumption or logic error}
CAUSAL CHAIN: "{A} does {X} because {Y}, but actual condition is {Z}"
RELATED: {is this pattern used elsewhere?}
```

### Phase 3: FIX & VERIFY

**Step 3.1: Implement fix**

- Write a failing test case if test framework exists
- Apply the minimum fix - change only what addresses the root cause
- Run typecheck/lint: no new errors

**Step 3.2: Visual verification** (compose live-preview)

- Take Playwright screenshot of affected route/component
- Compare against bug screenshot from Phase 1
- Verify: PASS (renders correctly) or FAIL (bug persists or new regression)

**Step 3.3: Functional verification** (compose qa)

- Write a Playwright test for the specific bug scenario
- Run any existing project tests for regression check

**Step 3.4: Emergency stop**

Fix fails twice: go back to Phase 2 with new hypotheses.
Three total failures: root cause analysis was wrong. Escalate to user.

### Phase 4: EVALUATE

Separate generation (the fix) from evaluation (the judgment).

**Grading criteria (4 dimensions):**

| Dimension | Question | Score |
|---|---|---|
| Correctness | Is the bug actually fixed? | PASS/FAIL |
| Visual Quality | Are there layout regressions? | PASS/FAIL |
| Completeness | Are edge cases handled? | PASS/PARTIAL/FAIL |
| Root Cause | Was the root cause addressed, not just the symptom? | PASS/FAIL |

**Red flags for symptom-only fixes:**
- Adding `!important` to CSS (masks specificity conflict)
- Wrapping in try/catch without handling the error
- Adding `setTimeout` to work around a race condition
- Hiding an element instead of fixing why it renders wrong

All 4 dimensions must be PASS for acceptance.

**Output:**

```
=== EVALUATION ===
Correctness:    {PASS/FAIL} - {evidence}
Visual Quality: {PASS/FAIL} - {evidence}
Completeness:   {PASS/PARTIAL/FAIL} - {evidence}
Root Cause:     {PASS/FAIL} - {evidence}
VERDICT: PASS / CONDITIONAL PASS / FAIL
ACTION REQUIRED: none / {specific items}
```

## Quality Gates

1. Phase 1 MUST produce a classification before any investigation begins
2. Phase 2 MUST test at least one hypothesis with observable evidence before code changes
3. Phase 3 MUST produce both a screenshot and a functional test (or VISUAL-UNVERIFIED note if Playwright unavailable)
4. Phase 4 MUST grade on all 4 dimensions
5. Investigation journal MUST be written to `.planning/debug-journal-{timestamp}.md`
6. **Degraded mode (browserPlaywright unavailable):** Skip screenshot verification (phases 3.2 and 3.3). Perform visual inspection by reading component source and CSS. Mark Correctness and Visual Quality as UNVERIFIED rather than PASS.

## Circuit Breakers

- **Time**: >30 minutes total: write handoff summary, ask user for guidance
- **Complexity**: fix requires 5+ file changes: escalate to `/marshal` or `/archon`
- **Cognitive load**: 2 failed hypothesis cycles: forced context reset with journal dump
- **Emergency stop**: 2 failed fixes: return to Phase 2; 3 total: escalate to user

## Composition

| Phase | Composes | What it reuses |
|---|---|---|
| Phase 2 | `/systematic-debugging` Phases 1-3 | Observe-hypothesize-verify structure |
| Phase 3.2 | `/live-preview` | Screenshot capture and PASS/FAIL classification |
| Phase 3.3 | `/qa` Step 3 | Playwright test pattern (navigate, interact, assert) |

## Exit Protocol

```
---HANDOFF---
- Bug: {problem statement from Phase 1}
- Category: {classified bug type}
- Root cause: {one-line cause from Phase 2}
- Fix: {what was changed in Phase 3}
- Evaluation: {4-dimension grades from Phase 4}
- Artifacts: screenshots at {path}, test at {path}, journal at {path}
- Related: {any similar patterns found}
---
```


Next skill: `qa` to verify the fix with a full browser pass, or `test-gen` to add regression tests for the fixed bug.