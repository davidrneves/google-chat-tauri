# Skill: setup

**Description**: First-run experience for hookforge. Detects the runtime, installs hooks, writes .hookforge/state.json, and guides the user through the minimal configuration needed to start using the harness.
**Version**: 1.0.0 | **Effort**: medium

## Identity

setup is the first-run experience for hookforge. It detects the user's AI runtime, installs the harness into the current project, and guides them through initial configuration. It produces a working harness installation with minimal friction.

**Example:** `/do set up hookforge for this project` → runtime detected (Claude Code via `.claude/`), hooks installed, test PostToolUse event fired successfully

## When to Use

- On first use of hookforge in a new project
- When adding hookforge to a project that already has a CLAUDE.md
- When `/do` routes "setup" or "install hookforge"

## Mode Detection

**Recommended mode** (default): guided walkthrough with explanations.

**Express mode**: triggered by `/setup --express` or when user says "quick setup" / "just install it". Applies defaults, asks no questions, skips explanations.

**Full tour mode**: triggered by `/setup --tour`. Explains every feature, covers advanced options, takes longer.

## Protocol

### Step 1: CHECK EXISTING INSTALLATION

Read `.hookforge/state.json`. If it exists and `installedRuntime` is set:
- Output: "hookforge is already installed (runtime: {runtime}, version: {version}). Run `/setup --reinstall` to reconfigure."
- Exit unless `--reinstall` flag is present.

### Step 2: DETECT RUNTIME

Determine the current AI runtime from environment signals:

| Signal | Runtime |
|---|---|
| `CLAUDE_CODE_ENTRYPOINT` env var set | claude-code |
| `.github/copilot-instructions.md` exists | copilot |
| `CODEX_RUNTIME` env var set | codex |
| `.kiro/` directory exists | kiro |
| Multiple signals | Ask the user |
| No signals | Ask the user |

Show the detected runtime to the user and ask for confirmation unless in express mode.

### Step 3: CHECK PREREQUISITES

For the detected runtime, verify prerequisites are met:

**All runtimes:**
- `node` is installed and >= 18 (run `node --version`)
- `bun` or `npm` is available for running hookforge commands

**Claude Code:**
- `.claude/` directory exists (Claude Code project)
- `settings.json` is writable

**Copilot:**
- `.github/` directory exists
- GitHub Actions are enabled (check `.github/workflows/`)

**Codex:**
- `CODEX_RUNTIME` environment detectable
- `AGENTS.md` or `codex.md` present

**Kiro:**
- `.kiro/` directory exists
- `.kiro/agents/` directory is writable

Report any missing prerequisites with instructions to resolve them. Do NOT proceed past this step if prerequisites are unmet.

### Step 4: INSTALL HOOKS

Run the appropriate install command for the detected runtime:

```bash
hookforge init --runtime {runtime} --yes
```

If `hookforge` CLI is not available on PATH (fresh install before CLI is set up), use the bootstrap path:

```bash
bunx hookforge init --runtime {runtime} --yes
```

Verify installation succeeded by checking that `.hookforge/state.json` was created.

### Step 5: CONFIGURE

Ask the user for initial configuration (skip all in express mode, use defaults):

1. **Trust level**: "How familiar are you with AI coding agents?"
   - Options: `novice` (guided, slower), `familiar` (standard), `trusted` (minimal confirmations)
   - Default: `novice`

2. **Project type**: "What kind of project is this?"
   - Options: web app, CLI tool, library/package, data/ML, other
   - Used to tune which skills are surfaced by default

3. **Skill preferences** (full tour only): Walk through optional skill categories and let the user opt in/out.

Write final config to `.hookforge/state.json`:
```json
{
  "sessionCount": 0,
  "campaignCount": 0,
  "trust": "{trust-level}",
  "lastSession": null,
  "installedRuntime": "{runtime}",
  "harnessVersion": "{version}",
  "activeCampaign": null
}
```

### Step 6: VERIFY

Run a smoke test:
```bash
hookforge status
```

If it returns a non-error output, installation is complete.

If it fails: show the error output and provide a diagnosis.

### Step 7: ORIENT

Show the user what's available:

```
hookforge is ready. Here's how to use it:

  /do [anything]        Universal router — describe what you want
  /do status            See what's happening
  /do --list            Browse all available skills

Getting started:
  Try /prd to turn your idea into a structured spec
  Or  /research to investigate a technical question
  Or just describe your task and /do will route it
```

In full tour mode: walk through 3 example scenarios that demonstrate the router, skill invocation, and campaign mode.

## Quality Gates

- Never write to `.hookforge/state.json` unless `hookforge init` succeeded
- Always confirm the detected runtime with the user before installing
- Prerequisites check is non-skippable — a broken install is worse than no install
- Express mode may skip questions but must NOT skip prerequisites check

## Exit Protocol

Output: "hookforge installed. Runtime: {runtime}. Run `/do [anything]` to start."

In express mode, skip the orientation and output only the one-line confirmation.


Next skill: `do` to start using the installed harness with your first task.