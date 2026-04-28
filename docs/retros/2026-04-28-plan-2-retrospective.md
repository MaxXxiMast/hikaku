# Plan 2 Retrospective

**Date**: 2026-04-28
**Scope**: Plan 2 (Metrics Engine) — Execution through merge
**SDLC Phase**: 7 (Retrospective + Next Cycle)

---

## What went well

1. **Subagent-driven development** — Fresh agent per task + two-stage review (spec then quality) caught issues early. 14 tasks executed with consistent quality.
2. **TDD discipline held** — Every module started with failing tests. The `percentile` formula bug was caught by the red phase.
3. **Parallel dispatch** — Tasks 3.4/3.5/3.6 ran simultaneously, ~3x speedup on Chunk 3.
4. **5-reviewer audit** — 5 independent lenses (spec, security, edge cases, architecture, plan drift) surfaced 4 critical + 6 high issues missed by per-task reviews. Shorts priority bug and unbounded pagination DoS would have shipped otherwise.
5. **Progress tracker file** — `plan-2-progress.md` made session resumption seamless after auth expiry mid-run.

## What went wrong

1. **Auth expired mid-task** — Lost an agent run. Progress tracker saved us but required manual state verification.
2. **Silent spec deviation** — Implementer agent dropped `fd` keyword from FD Comparison without flagging it. Only caught by 5-reviewer audit.
3. **Cross-module DRY violation** — `getDurationBucket` duplicated in engagement.ts and patterns.ts. Per-task reviews couldn't see across modules.
4. **Weak test assertions** — Many tests use `> 0` instead of exact fixture-derived values. Known limitation we deferred.
5. **No 3-4 channel tests** — Verdict was structurally broken for 3+ channels. Fixtures only use 2 channels.

## Process changes for Plan 3

| Learning | New Rule |
|----------|---------|
| Agents silently deviate from spec | Implementer prompt must say "flag any spec deviation, do NOT silently adjust" |
| DRY violations across parallel tasks | After parallel chunk completion, run a cross-module DRY scan before moving on |
| Weak test assertions slip through | Plan must include ≥2 exact-value assertions per module |
| 5-reviewer audit is essential but expensive | Run once after all implementation, not per-task. Keep two-stage per-task review for fast feedback. |
| Progress tracker saved the session | Always create `plan-N-progress.md` at execution start |
