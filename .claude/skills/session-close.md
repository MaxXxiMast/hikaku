---
name: session-close
description: "Close the current working session — summarize work done, update project memory, create handoff context, commit docs. Use when ending a session, before context runs out, or when switching to another project. Trigger on: '/session-close', 'close session', 'end session', 'wrap up', 'save progress', 'handoff'."
---

# Session Close — Hikaku Project

Gracefully close the current working session with full context preservation for seamless pickup in a new session.

## When to Use

- End of a productive work session
- Before context window runs out
- Switching to another project
- User says "close", "wrap up", "save progress", "handoff"

## Process

Execute these steps in order:

### 1. Summarize Work Done

Create a brief summary of this session:
- What was the starting state? (branch, test count, last completed task)
- What was accomplished? (tasks completed, PRs merged, decisions made)
- What changed? (files created/modified, test count delta)

### 2. Update Project Memory

Update `~/.claude/projects/-Users-purujitnegi-Desktop-puru-codes-hikaku/memory/project_hikaku_status.md` with:
- Current SDLC phase and plan status
- What's merged to master
- What's next (exact pickup point)
- Any blockers or open questions

### 3. Check for Uncommitted Work

```bash
git status
git diff --stat
```

If there are uncommitted changes:
- Docs/plans → commit them with a descriptive message
- Code changes → warn the user, don't auto-commit code
- Stale task lists → note in handoff

### 4. Update Progress Tracker

If a `docs/plans/*-progress.md` file exists for the current plan, ensure it reflects the latest task statuses.

### 5. Write Handoff Summary

Present to the user (not saved to file — this is terminal output):

```
## Session Handoff

**Date**: YYYY-MM-DD
**Branch**: current branch
**Tests**: N passing
**Last commit**: hash — message

### Completed This Session
- [ list of completed items ]

### Pickup Point
- Exact next step (e.g., "Write Plan 3B implementation plan")
- Key files to read first
- Any context the next session needs

### Open Items
- [ anything deferred or unresolved ]
```

### 6. Stop the Visual Companion (if running)

Check if a brainstorming visual companion server is running:
```bash
ls .superpowers/brainstorm/*/state/server-info 2>/dev/null
```
If found, stop it:
```bash
SCRIPT_DIR="$(find ~/.claude/plugins/cache -path '*/superpowers/*/skills/brainstorming/scripts' -type d 2>/dev/null | head -1)"
SESSION_DIR="$(ls -td .superpowers/brainstorm/*/ 2>/dev/null | head -1)"
[ -n "$SCRIPT_DIR" ] && [ -n "$SESSION_DIR" ] && "$SCRIPT_DIR/stop-server.sh" "$SESSION_DIR" 2>/dev/null
```

## Rules

- **Never auto-commit code** — only docs/plans
- **Always update memory** — this is the cross-session bridge
- **Keep handoff concise** — the next session reads memory + CLAUDE.md, not a novel
- **Check git status** — don't leave dirty working directory without warning
