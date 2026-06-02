# Skill: schedule

**Description**: Manages recurring and one-off scheduled tasks. Session-scoped scheduling via CronCreate/CronDelete/CronList. Default path uses the local OS scheduler. Explains the cloud path for tasks that need to survive machine sleep.
**Version**: 1.0.0 | **Effort**: low
**Requires**: cronLocal, cronRemote

## Identity

schedule creates, lists, and removes recurring tasks. The default path is local (OS cron or `scripts/local-schedule.js`) which consumes zero cloud quota. Pass `--remote` to use session-scoped CronCreate or RemoteTrigger.

**Example:** `/do remind me to rotate API keys every 90 days` → cron entry created; next run scheduled for 2026-09-01

## When to Use

- When a task should repeat on a schedule (daily report, weekly cleanup)
- To set up a cron-like job within the current session or persisted via daemon
- When `/do` routes "schedule" or "recurring task"

## Default Path (no `--remote`)

Run:
```bash
node scripts/local-schedule.js add "<cron-expr>" "<command>"
```

This installs a native OS entry (Unix cron or Windows Task Scheduler) that survives session end, machine reboot, and consumes zero cloud quota.

If `scripts/local-schedule.js` is not present: fall back to documenting the schedule in `.hookforge/harness.json` under `schedules[]` and give the user the raw OS command to run.

## Commands

| Command | Behavior |
|---|---|
| `/schedule list` | Show active schedules |
| `/schedule add "{description}" {/skill}` | Add a recurring task |
| `/schedule remove {id}` | Remove a task |
| `/schedule status` | Same as list, with last-run info |

## Protocol

### /schedule list

```bash
node scripts/local-schedule.js list
# or CronList if --remote
```

Output:
```
Active schedules (N):
  [id] {description} - {cron expression} - next run: {time}

No schedules active.
```

---

### /schedule add "{description}" {/skill-or-command}

1. Parse interval from natural language
2. Convert to cron expression (see table below)
3. Confirm: "I'll run `{command}` {natural-language-interval} (cron: `{expression}`). OK?"
4. If confirmed: install via default path (local-schedule.js) unless `--remote` passed
5. Output: "Scheduled. ID: {id}. Use `/schedule remove {id}` to cancel."

**Cron Conversion Table:**

| Natural Language | Cron Expression |
|---|---|
| every minute | `* * * * *` |
| every 5 minutes | `*/5 * * * *` |
| every 15 minutes | `*/15 * * * *` |
| every 30 minutes | `*/30 * * * *` |
| every hour | `0 * * * *` |
| every 2 hours | `0 */2 * * *` |
| every day / daily | `0 9 * * *` (default 9am) |
| every day at {H}am/pm | `0 {H} * * *` |
| every weekday | `0 9 * * 1-5` |
| every Monday | `0 9 * * 1` |

If the user provides a raw cron expression, use it as-is. Validate it has 5 fields.

**Warn** if interval is every minute or faster: "This will fire 60+ times/hour. Consider every 5-15 minutes."

---

### /schedule remove {id}

Remove a task by ID. If user doesn't know the ID, run list first.

Output: "Removed schedule {id} ({description})."

---

## Session-Scoped vs. Persistent

| Type | Tool | Survives session? | Quota cost |
|------|------|-------------------|------------|
| Local OS | local-schedule.js | Yes (machine reboot survives) | 0 |
| Session-scoped | CronCreate | No (cleared on session end) | 0 |
| Cloud-persistent | RemoteTrigger | Yes (Anthropic infra) | 15/day cap |

Recommend local OS for: persistent checks, overnight monitoring.
Recommend CronCreate for: in-session reminders, polling during active work.
Recommend RemoteTrigger (via `--remote`): cloud-based overnight tasks where machine may sleep.

**RemoteTrigger quota note:** CronCreate tasks are session-scoped (cleared when Claude Code closes). RemoteTrigger counts against the 15 routine runs/24h account cap. Confirm before using `--remote`.

## Fringe Cases

- **Ambiguous interval**: Ask for clarification before creating.
- **User provides 5-field cron directly**: Accept, skip conversion.
- **User wants to pause (not delete)**: Pause not supported. Remove and recreate.
- **No schedules when listing**: "No active schedules. Use `/schedule add` to create one."

## Quality Gates

- Always confirm before creating (scheduling is a side effect)
- Always show the cron expression alongside natural-language description
- Always provide the ID after creation
- Never leave a user unable to remove a schedule they created

## Exit Protocol

- After `add`: "Scheduled. ID: {id}. Use `/schedule remove {id}` to cancel."
- After `remove`: "Removed schedule {id}."
- After `list`: the active schedule list.

No HANDOFF block - schedule is a utility, not a campaign-level skill.


Next skill: `daemon` to run scheduled campaigns autonomously, or `autopilot` to process a scheduled intake pipeline.