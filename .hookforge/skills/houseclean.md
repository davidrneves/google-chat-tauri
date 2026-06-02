# Skill: houseclean

**Description**: Cross-platform storage audit and cleanup. Surveys all drives, finds orphaned git worktrees, large AI tool caches, and rebuildable artifacts. Produces a prioritized action plan with specific migration or deletion commands.
**Version**: 1.0.0 | **Effort**: medium

## Identity

houseclean finds what's eating disk space, explains why it's there, and provides exact commands to clean or migrate each item. It never deletes anything without confirming first - but does remove empty dirs and orphaned merged worktrees automatically (always safe).

**Example:** `/do free up some disk space` → 47 GB found across 12 worktrees (4 merged) and AI caches; exact cleanup commands listed per item

## When to Use

- When disk space is low and you need to identify what is safe to delete
- Periodically to remove stale worktrees, AI caches, and orphaned artifacts
- When `/do` routes "houseclean" or "cleanup storage"

## Invocation Forms

```
/houseclean              # Full audit - all phases
/houseclean --quick      # Drive survey + quick wins only
/houseclean --worktrees  # Orphaned worktree audit only
/houseclean --ai-tools   # AI tool cache audit only
/houseclean --projects   # Project artifact scan only
```

## Protocol

### Phase 1: DRIVE SURVEY

**macOS/Linux:**
```bash
df -h
```

**Windows (PowerShell):**
```powershell
Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free, Root | Format-Table
```

Present as:
```
Drive      Total    Used     Free
/          500 GB   320 GB   180 GB
/Volumes/D 931 GB   150 GB   781 GB
```

Flag: Free < 5 GB = CRITICAL. Free < 20 GB = WARNING.

Store which drives have free space - these are migration targets.

### Phase 2: HOME DIRECTORY HOT SPOTS

Run a recursive size scan of the home directory, top 15 entries:

**macOS/Linux:**
```bash
du -sh ~/* 2>/dev/null | sort -rh | head -15
```

**Windows:**
```powershell
Get-ChildItem "$env:USERPROFILE" -Directory | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  [PSCustomObject]@{GB=[math]::Round($s/1GB,2); Path=$_.Name}
} | Sort-Object GB -Descending | Select-Object -First 15
```

Tag each entry:
- **AI-tool-data** - `.ollama`, `.gemini`, `.cursor`, `.windsurf`, `.codex`
- **Package-cache** - npm-cache, pip cache, `.gradle`
- **Projects** - active project directories
- **Conversation-history** - `.claude/projects`, `.hookforge/projects`
- **System** - AppData, Library, etc.

### Phase 3: ORPHANED WORKTREE AUDIT

```bash
git rev-parse --show-toplevel  # verify we're in a repo
git worktree list
```

For each worktree (excluding main):
1. Check if branch is merged: `git branch --merged HEAD | grep "{branch}"`
2. Check if worktree directory exists
3. Check for uncommitted changes: `git -C "{path}" status --short`

Classify:
- **SAFE TO REMOVE** - branch merged, no uncommitted changes
- **REVIEW FIRST** - branch not merged, has changes
- **STALE** - worktree path missing (registered but deleted)
- **ACTIVE** - branch not merged, no changes (in-flight)

Remove SAFE and STALE automatically:
```bash
git worktree remove "{path}" --force
git branch -d "{branch}"
```

Report what was removed. Ask before touching REVIEW FIRST or ACTIVE.

### Phase 4: AI TOOL CACHE AUDIT

Check standard cache locations (adjust for OS):

```
macOS:
  ~/.ollama/models         -> Ollama LLM models
  ~/.gemini                -> Gemini CLI data
  ~/.cursor                -> Cursor editor
  ~/.config/Codeium        -> Windsurf/Codeium
  ~/Library/Caches/pip     -> pip cache

Linux:
  ~/.ollama/models
  ~/.cache/huggingface     -> HuggingFace models
  ~/.npm/_cacache          -> npm cache

Windows:
  AppData/Local/npm-cache
  AppData/Local/pip/cache
```

For each that exists and is > 500 MB, report:
```
~/.ollama/models    15.8 GB   AI-tool-data   [MOVE to external drive]
~/.gemini           10.2 GB   AI-tool-data   [MOVE to external drive]
npm-cache            5.7 GB   Package-cache  [SAFE TO CLEAR]
```

Tag recommended actions:
- **SAFE TO CLEAR** - caches that rebuild automatically (npm, pip, temp)
- **MOVE** - tool data that can be redirected via env var
- **REVIEW** - data that needs user decision

### Phase 5: PROJECT ARTIFACT SCAN

Find rebuildable artifacts in project directories:

```bash
# macOS/Linux
find ~/Workspace -name "node_modules" -type d -prune -print 2>/dev/null | while read d; do
  du -sh "$d" 2>/dev/null
done | sort -rh | head -20

find ~/Workspace -name ".venv" -type d -prune -print 2>/dev/null
find ~/Workspace -name "dist" -type d -prune -print 2>/dev/null
find ~/Workspace -name "__pycache__" -type d 2>/dev/null
```

For each found: report project path, size, last modified.
Flag items not modified in > 30 days as deletion candidates.
Ask the user before deleting any.

### Phase 6: QUICK WINS REPORT

```
=== QUICK WINS (safe to act on now) ===

1. npm-cache              5.7 GB   CLEAR    npm cache clean --force
2. Temp files             474 MB   CLEAR    (auto-cleaned)
3. Merged worktrees (17)   50 MB   REMOVED  (already done)

=== MOVE TO ANOTHER DRIVE ===

4. ~/.ollama/models       15.8 GB  MOVE     See migration guide
5. ~/.gemini              10.2 GB  MOVE     See migration guide

=== REVIEW WITH USER ===

6. ~/.claude/projects      3.1 GB  REVIEW   Conversation history

Total recoverable: ~47 GB
```

### Phase 7: MIGRATION COMMANDS

**Ollama (models to another drive):**
```bash
# macOS/Linux
OLLAMA_MODELS="/path/to/other/drive/.ollama/models"
mv ~/.ollama/models "$OLLAMA_MODELS"
echo 'export OLLAMA_MODELS="/path/to/other/drive/.ollama/models"' >> ~/.zshrc
```

**npm cache redirect:**
```bash
npm cache clean --force
npm config set cache "/path/to/other/drive/npm-cache"
```

**Windows junction (for tools without env var support):**
```powershell
robocopy "$env:USERPROFILE\.cursor" "F:\.cursor" /E /MOVE
cmd /c mklink /J "$env:USERPROFILE\.cursor" "F:\.cursor"
```

After cleanup, record decisions in `.hookforge/harness.json`:
```json
{
  "storage": {
    "last_audit": "2026-05-26",
    "notes": "Freed 47 GB by moving AI tools to external drive"
  }
}
```

## Quality Gates

- Never delete without confirming branch is merged (for worktrees)
- Always check for uncommitted changes before removing a worktree
- Show exact commands, not vague instructions
- After cleanup, verify free space actually increased (re-run Phase 1)

## Exit Protocol

Show:
1. Total space freed this session
2. Space still recoverable with user action
3. Current primary drive free space
4. Suggest: "/houseclean runs well as a monthly check - use /schedule to add it"

```
---HANDOFF---
- Freed: {X} GB (caches cleared, worktrees removed)
- Pending user action: {Y} GB (AI tools to move, artifacts to clean)
- Primary drive free: {Z} GB
---
```


Next skill: `organize` to restructure files now that disk space is freed, or `schedule` to automate future houseclean runs.