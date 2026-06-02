# Skill: watch

**Description**: File sentinel that monitors the working directory for changes and @hookforge marker comments, then auto-triggers appropriate skills. Poll-based via git diff against last scan commit. Writes intake items for batch processing. Default path is a local filesystem runner; --remote uses session-scoped CronCreate.
**Version**: 1.0.0 | **Effort**: low
**Requires**: fileWatching

## Default Execution Path (READ FIRST)

**`/watch start` does NOT use CronCreate by default.** The local runner is the default. Only pass `--remote` to use session-scoped scheduling, and only after explicit confirmation.

**Why:** CronCreate counts against the account-wide 15 routine runs/24h cap. At a 5-minute interval, a watch exhausts the quota in under an hour.

### Default flow: `/watch start` (no `--remote`)

1. Check for existing watch, determine baseline commit (Steps 1-2 below)
2. Skip CronCreate - leave `cronId: null` in state file
3. Write state file (`status: "watching"`)
4. Output:
   ```
   Watch state created: .planning/watch-state.json
     Baseline: {commit hash}

   To start real-time watching, run in a separate terminal:
     node .hookforge/scripts/watch-local.js

   It uses filesystem events (not polling), triggers scans on change, and
   consumes zero routine quota. Stop with Ctrl+C.

   For cloud-persistent polling:
     /watch start --remote     (uses CronCreate, counts against 15/day cap)
   ```

### Remote flow: `/watch start --remote`

Only when `--remote` is explicitly passed:
1. Confirm: "This uses CronCreate, counting against your 15 routine runs/24h quota. At 5-minute interval this exhausts quota in under an hour. Continue? (y/N)"
2. On confirmation: proceed with full Step 3 (CronCreate).

## Identity

watch detects what changed since the last scan, finds `@hookforge:` marker comments that request specific actions, and dispatches work to the right skill. It does not do the work itself - it detects and routes.

**Example:** `/do watch src/ for changes` → watcher started; next Write triggers `verify` via `@hookforge: check types` marker comment

## When to Use

- When working in flow state and wanting auto-routing as you save files with `@hookforge:` markers
- When monitoring a directory for changes that should trigger skills automatically
- When `/do` routes "watch" or "file monitor"

## Commands

| Command | Behavior |
|---|---|
| `/watch start` | Default: create state, prompt user to run local runner |
| `/watch start --remote` | Use CronCreate polling (requires confirmation) |
| `/watch start --interval {N}m` | Set poll interval for `--remote` mode (default: 5m) |
| `/watch stop` | Stop watching, tear down cron |
| `/watch status` | Show watch state, last scan time, pending actions |
| `/watch scan` | Run a single scan now (manual trigger) |

## Protocol

### /watch start

**Step 1: Check for existing watch**

1. Read `.planning/watch-state.json` if it exists
2. If `status: "watching"`: show state, ask "A watch is already active. Stop it and start a new one?"

**Step 2: Determine baseline commit**

1. Run `git rev-parse HEAD` to get current commit hash
2. If not a git repo: fall back to timestamp-based detection
3. Store as `lastScanCommit`

**Step 3: Create poll schedule** (remote only)

```
CronCreate: interval: "{N}m", command: "/watch scan"
```

Save cron ID in state file.

**Step 4: Write state file**

`.planning/watch-state.json`:
```json
{
  "status": "watching",
  "lastScanCommit": "abc1234",
  "lastScanTime": null,
  "interval": "5m",
  "cronId": null,
  "pendingActions": [],
  "processedMarkers": [],
  "stats": {
    "scansRun": 0,
    "markersFound": 0,
    "intakeItemsCreated": 0,
    "skillsDispatched": 0
  }
}
```

### /watch stop

1. Read state file. If not watching: "No watch is active."
2. Delete cron: `CronDelete: {cronId}` (skip if cronId is null or deletion fails)
3. Update state: `status: "stopped"`, `cronId: null`
4. Output stop summary with lifetime stats

### /watch status

Output current state from `.planning/watch-state.json`.

### /watch scan

The core detection and dispatch loop. Runs on every poll tick or when invoked manually.

**Step 1: Load state**

Read `.planning/watch-state.json`. If missing: create default state with `lastScanCommit` from `git rev-parse HEAD`.

**Step 2: Detect changed files**

```bash
# Committed changes since last scan
git diff --name-only {lastScanCommit} HEAD

# Unstaged changes
git diff --name-only

# Staged changes
git diff --name-only --cached
```

Merge and deduplicate. If no files changed: update stats and exit.

Fallback (no git): `find . -newer {timestamp_file} -type f`, exclude `node_modules/`, `.git/`, `.planning/`, `dist/`, `build/`.

**Step 3: Scan for marker comments**

For each changed file, search for:

| Pattern | Languages |
|---|---|
| `// @hookforge: {action} {description}` | JS, TS, Go, Rust, C, Java |
| `# @hookforge: {action} {description}` | Python, Shell, YAML, Ruby |
| `/* @hookforge: {action} {description} */` | CSS, multi-line C-style |
| `<!-- @hookforge: {action} {description} -->` | HTML, Markdown |

**Action-to-skill mapping:**

| Action | Skill |
|---|---|
| `review` | `/review` |
| `test` | `/test-gen` |
| `fix` | `/systematic-debugging` |
| `document` | `/doc-gen` |
| `refactor` | `/refactor` |
| `todo` | intake item |

Unknown actions become intake items with raw action preserved.

Deduplication: skip markers already in `processedMarkers` (stored as `"{file}:{line}:{action}"`). Remove a marker from the list when its file is modified again.

**Step 4: Classify unmarked changes**

| File pattern | Auto-action |
|---|---|
| `*.test.*`, `*.spec.*`, `__tests__/*` | Queue: "run tests" intake item |
| `*.md` in `docs/` or root | Queue: "doc staleness check" intake item |
| `src/**/*.ts`, `src/**/*.tsx` | Queue: "changed source" intake item |
| `package.json`, `tsconfig.json` | Queue: "config change" intake item (high priority) |

**Step 5: Dispatch markers**

For each new marker (not yet processed):

```
/do {action} in {file} at line {line}: {description}
```

Batch limit: dispatch at most 5 marker actions per scan. Queue overflow in `pendingActions`.

**Step 6: Write intake items**

For each classified change, write to `.planning/intake/`:

Filename: `watch-{timestamp}-{index}.md`

```markdown
---
source: watch
priority: normal | high
created: {ISO}
---

# {brief description}

File: {file path}
Change type: new | modified | deleted
Classification: {type}
Detected by /watch scan at {ISO}.
```

Deduplication: skip if an item already exists for this file + classification.

**Step 7: Update state file**

- `lastScanCommit`: `git rev-parse HEAD`
- `lastScanTime`: current ISO
- Increment `stats.scansRun`
- Update `stats.markersFound`, `pendingActions`, `processedMarkers`

**Step 8: Report** (manual scan only, silent on cron)

```
Scan complete.
  Files changed:      {N}
  Markers found:      {new} ({total} total)
  Actions dispatched: {N} (batch limit: 5)
  Intake items:       {N} written to .planning/intake/
  Pending actions:    {N} (dispatch on next scan)
```

## Integration Points

- **Intake pipeline**: writes to `.planning/intake/` for `/autopilot`
- **Intent router**: routes markers through `/do`, never invokes skills directly
- **Daemon**: `/daemon` can start a watch alongside a campaign; the watch feeds intake items

## Fringe Cases

- **`.planning/` missing**: Create `.planning/` and `.planning/intake/` on first scan
- **Not a git repo**: Fall back to timestamp-based detection; warn on first scan
- **No files changed**: Update stats, exit silently
- **Unknown marker action**: treat as intake item
- **Deleted file**: skip marker scanning; write deletion intake item
- **Large diff (100+ files)**: Cap marker scanning at first 50 changed files; queue rest
- **Binary files**: skip marker scanning for binaries (detected via `git diff --numstat`)
- **watch-state.json corrupted**: reset to defaults, preserve `processedMarkers` if readable
- **Multiple scans overlapping**: if `lastScanTime` is within last 60 seconds, skip

## Quality Gates

- Scan must complete in under 10 seconds for repos up to 100K lines
- Must not create duplicate intake items
- Must not re-dispatch processed markers
- Batch limit of 5 dispatches per scan enforced
- State file updated atomically at end of scan (not incrementally)
- **Degraded mode (fileWatching unavailable):** Use `/watch scan` as a manual one-shot between sessions. Real-time monitoring is unavailable; diffs against last known commit still work.

## Exit Protocol

After `/watch start`: output confirmation block, no HANDOFF.
After `/watch stop`: output stop summary with lifetime stats.
After `/watch scan` (manual): output scan report with counts.
After `/watch scan` (cron): silent, update state file only.


Next skill: the skill named in the `@hookforge:` marker that triggered the scan -- typically `refactor`, `doc-gen`, or `systematic-debugging`.