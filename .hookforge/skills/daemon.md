# Skill: daemon

**Description**: Continuous autonomous operation controller. Starts, stops, and monitors a self-rescheduling agent loop that drives an active campaign to completion without manual session re-invocation. Default path uses the SessionStart hook bridge. Pass --remote to use cloud-persistent scheduling.
**Version**: 1.0.0 | **Effort**: low
**Requires**: cronRemote

## Identity

daemon turns a campaign into a continuous process. The default path is the SessionStart hook bridge: every time Claude Code opens a new session, the bridge reads `.planning/daemon.json`, finds the active campaign, and resumes archon. No cloud scheduling, no quota cost.

Pass `--remote` to add cloud-persistent scheduling via RemoteTrigger. This is opt-in, quoted with quota impact, and requires the `cronRemote` capability.

**Example:** `/do run improve hookforge overnight` → `daemon.json` written, SessionStart hook configured; loops resume on every new Claude Code session

## When to Use

- When you want `improve`, `pr-watch`, or `autopilot` to run across multiple sessions
- To attach a campaign to a background process that restarts on crash
- When `/do` routes "daemon" or "background"

## Commands

| Command | Behavior |
|---|---|
| `/daemon start [--campaign {slug}]` | Activate the daemon for the active (or named) campaign |
| `/daemon stop` | Deactivate the daemon, write final status |
| `/daemon status` | Show daemon state from `.planning/daemon.json` |
| `/daemon start --remote` | Activate with RemoteTrigger cloud scheduling (see below) |

## Protocol

### /daemon start

1. Find the active campaign:
   - If `--campaign {slug}` provided: use that campaign
   - Otherwise: read `.planning/campaigns/` for the most recently modified active campaign

2. Read `.planning/daemon.json`. If status is `running`: "Daemon already running for campaign {slug}. Use `/daemon status` to check progress."

3. Compute cost estimate:
   - Read `.planning/telemetry/session-costs.jsonl` if it exists
   - If prior sessions exist: use average `estimated_cost` as per-session estimate
   - If no prior data: use $3 per session as default
   - Total estimate = per-session cost * estimated remaining sessions

4. Confirm: "Daemon will run campaign `{slug}` continuously until complete or budget exhausted (~${total}). OK? [y/n]"

5. Write `.planning/daemon.json`:
   ```json
   {
     "status": "running",
     "campaignSlug": "{slug}",
     "startedAt": "{ISO}",
     "budget": {total * 2},
     "costPerSession": {per-session},
     "spent": 0,
     "sessions": 0,
     "stopReason": null,
     "stoppedAt": null,
     "localChainId": null,
     "watchdogId": null
   }
   ```

6. **Default path (no --remote)**:
   - The SessionStart hook bridge reads `.planning/daemon.json` on every session open
   - If `status: "running"` and budget not exhausted: bridge invokes `/archon continue` automatically
   - No additional setup needed. The daemon activates on the next Claude Code session open.
   - Output: "Daemon activated. Opens new sessions automatically. Budget: ${budget}. Check `.planning/daemon.json` anytime."

7. **Remote path (--remote flag)**:
   Requires `cronRemote` capability. Creates two RemoteTrigger entries:
   - **Self-rescheduling chain**: fires on session end, immediately schedules the next session (interval: 5 minutes)
   - **Watchdog**: fires every 60 minutes to check if the campaign is still active; stops the chain if campaign is complete
   
   Write trigger IDs to daemon.json: `localChainId` and `watchdogId`.
   Output: "Daemon activated with remote scheduling. Budget: ${budget}. Use `/daemon stop` to cancel."

### /daemon stop

1. Read `.planning/daemon.json`
2. If RemoteTrigger IDs exist: delete them via CronDelete
3. Write daemon.json:
   ```json
   {
     "status": "stopped",
     "stopReason": "user-requested",
     "stoppedAt": "{ISO}"
   }
   ```
4. Output: "Daemon stopped. Campaign `{slug}` is paused. Resume manually with `/archon continue`."

### /daemon status

Read `.planning/daemon.json` and output:

```
Daemon status: {running | stopped | completed | budget-exceeded}

Campaign: {slug}
Started: {human-readable datetime}
Sessions run: {N}
Budget: ${spent} / ${budget} ({percent}% used)
Last session: {last-session-start if available}
Stop reason: {if stopped}

To stop: /daemon stop
```

If `.planning/daemon.json` doesn't exist: "No daemon running. Use `/daemon start` to activate."

### Budget Tracking

The SessionStart hook bridge (or the RemoteTrigger watchdog) reads `spent` vs `budget` from daemon.json after each session:

- If `spent >= budget`: stop the daemon. Write `status: "budget-exceeded"`, `stopReason: "budget-exceeded"`.
- If campaign is complete (`status: completed` in campaign file): stop the daemon. Write `status: "completed"`, `stopReason: "campaign-complete"`.
- If 3+ consecutive session failures: stop the daemon. Write `status: "stopped"`, `stopReason: "consecutive-failures"`.

### SessionStart Hook Bridge (how daemon works locally)

The hookforge SessionStart hook (`hooks/session-start.ts` or runtime equivalent) implements this logic:

```
1. Read .planning/daemon.json
2. If status != "running": exit, do nothing
3. If spent >= budget: stop daemon (status: budget-exceeded), exit
4. Find campaign file for campaignSlug
5. If campaign.status == "completed": stop daemon (status: completed), exit
6. Invoke /archon continue
7. After session: increment sessions count, update spent estimate in daemon.json
```

This is the default path. Zero cloud quota cost.

## Fringe Cases

- **No active campaign**: "/daemon start requires an active campaign. Run `/archon [direction]` first to create one."
- **Daemon already running**: Show status and offer to stop.
- **Budget exhausted mid-session**: archon will finish the current phase, then daemon stops. It does not abort mid-phase.
- **Campaign manually completed while daemon running**: Watchdog (remote) or bridge (local) detects completion and stops daemon cleanly.
- **`.planning/daemon.json` corrupted**: Treat as no daemon. Offer to start fresh.
- **cronRemote unavailable but --remote passed**: "RemoteTrigger is not available on this runtime. Daemon will use the SessionStart hook bridge instead (local-only). This means it only continues when Claude Code is open." Proceed with local path.

## Quality Gates

- Always confirm budget before starting
- Never start a daemon without an active campaign
- Remote path (--remote) must confirm quota impact before creating triggers
- daemon.json must be kept in sync (sessions count, spent estimate)
- Budget exceeded = hard stop, not a soft suggestion

## Exit Protocol

For `/daemon start`:
```
---HANDOFF---
- Daemon activated for campaign: {slug}
- Mode: local (SessionStart hook bridge) | remote (RemoteTrigger)
- Budget: ${budget} ({estimated} sessions)
- To stop: /daemon stop or delete .planning/daemon.json
---
```


Next skill: `dashboard` to monitor active daemon campaigns, or `telemetry` to review executed sessions.