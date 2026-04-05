# Plan 2 Brainstorm Session

**Date**: 2026-04-05
**Participants**: Purujit Negi + Claude (AI pair)
**Context**: Brainstorming for Plan 2 (Metrics Engine) before entering Phase 2 (ADRs) and Phase 4 (Planning)

---

## Decisions Made

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Category classification scope | Finance-only for V1 | YAGNI — solve our use case first, architecture doesn't lock us in |
| 2 | Plan task format | Tests + signatures + constraints (no full implementations) | True TDD — implementation discovered through making tests pass |
| 3 | subscriberEfficiency + contentFreshness | Inline in orchestrator (no standalone modules) | KISS — 3-5 lines of math don't warrant their own files |
| 4 | Testing strategy split | Mock fetch for API client, real fixtures for computation | Natural boundary — mock I/O, test pure functions with real data |
| 5 | Verdict dimensions | 15 dimensions (12 computable + 3 multi-signal inferences) | Matches WW vs FRA report; "subjective" ones are actually derivable from data |
| 6 | Raw data shape | Fat — pull everything YouTube API gives us | Zero extra quota cost, enables future analysis, 72h purge handles storage |
| 7 | Channel handle resolution | `forHandle` on Channels endpoint (1 unit) instead of Search API (100 units) | 100x cheaper quota, validated in official docs (added Jan 2024) |
| 8 | Orchestrator purity | Orchestrator does light computation inline | overview, subscriberEfficiency, contentFreshness stay inline (~30 lines of simple math). Extract if it grows. KISS > SRP at this scale. |
| 9 | Edge case testing strategy | One shared fixture (happy path) + inline edge cases per module | Fixtures provide realistic baseline (WW vs FRA). Each module adds its own edge cases (empty, single, skewed). Test suite grows from real user failures as regression tests. |
| 10 | Partial failure handling | Atomic fail — all channels must resolve or comparison fails | Don't waste quota on partial comparisons. Show clear error, let user fix the handle. YAGNI on partial results. |
| 11 | growth.ts scope | One module serves both Section 3 (MoM Viewership) and Section 5 (Growth Trajectory) | Monthly aggregation is shared prerequisite. Returns `{ monthlyComparison, lifecyclePhases }`. Both sections render different views of same data. |
| 12 | Date determinism | `computeReport` accepts `referenceDate` parameter | Makes all date-dependent computation (contentFreshness, growth) pure and testable. Tests pass fixed date, production passes `new Date()`. |
| 13 | Verdict scoring algorithm | Threshold-based with ties — <5% difference = tie | Matches WW vs FRA report which has ties. Prevents false precision on close metrics. |
| 14 | API response validation | Zod schemas at YouTube API boundary | Already doing ad-hoc validation (`|| 0` fallbacks). Zod formalizes conversions in one place — one source of truth for response shape. Zod already installed. |
| 15 | All 15 verdict dimensions | Keep all 15 from WW vs FRA report exactly | Including Long-term Defensibility. All are computable from existing data via multi-signal inference. |
| 16 | Pagination strategy | Time-windowed with `since` parameter, default 4 months | Fair comparison (apples-to-apples within same timeframe). Channel-level all-time stats from Channels endpoint (1 unit) provide scale context. Full history = `since: undefined`. UI time range selector in Plan 3. |

## Open — Needs ADR

| # | Topic | Why it needs an ADR |
|---|-------|-------------------|
| 1 | Fat raw data storage | Changes RawVideo/RawChannel interfaces, affects Convex schema, trade-off between storage cost and future capability |
| 2 | forHandle vs Search API | Changes quota budget, affects rate limiting strategy, 100x cost difference |

## Future Scope — Product Evolution Ideas

These emerged during brainstorming. They are NOT in V1 scope. Captured here for future revisit. Archive if no longer valuable.

### FS-1: Learning System — Aggregate Insights Across Comparisons

**Idea**: Raw data gets purged at 72h, but patterns extracted from comparisons could persist permanently. "Finance channels with question titles get 22% more views" — insights that emerge across many comparisons.

**What it requires**: Structured verdict storage (not flat text) so dimensions are queryable across comparisons. Permanent metadata already in spec (channels, timestamp) would need to include verdict dimensions.

**Seed for V1**: Store verdict dimensions as structured data in Convex. Don't build the learning loop — just make the data queryable for when we do.

### FS-2: Open-Ended User Questions Against Raw Data

**Idea**: After a comparison is generated, let users ask follow-up questions ("how does their thumbnail strategy compare?", "what about collaboration patterns?"). The raw data is in Convex for 72h — an LLM could query it.

**What it requires**: Raw data available for querying (already the case with fat storage), LLM integration for natural language → analysis, some form of function calling or structured query.

**Why it matters**: The 15 verdict dimensions are a default view. The real value is unlimited exploration. User questions also signal which dimensions to add next.

### FS-3: Expanding Verdict Dimensions Over Time

**Idea**: Start with 15, but new dimensions emerge from: (a) user questions (FS-2), (b) aggregate patterns (FS-1), (c) new data sources (e.g., thumbnail analysis, comment sentiment). The verdict module should be extensible.

**What it requires**: Verdict dimensions as a registry/config rather than hardcoded list. Each dimension: name, data sources, scoring function, display format. New dimensions = new entries, not code changes.

**V1 compatibility**: Current pure-function architecture supports this — add a new scoring function, register it. No architectural change needed, just a pattern to follow.

### FS-4: ML/LLM-Based Category Classification

**Idea**: Replace keyword-based category classification with ML or LLM classification that works for any channel type (gaming, cooking, tech), not just finance.

**What it requires**: Either a trained classifier or LLM API call per video title + description. Cost implications for LLM approach.

**V1 compatibility**: `categories.ts` is a standalone module with a clean interface (`classifyVideo(title) → string`). Swapping the implementation is a one-file change.

### FS-5: LLM-Generated Executive Summaries

**Idea**: Replace template-based summary generation with LLM-generated narratives that surface non-obvious insights and read like the WW vs FRA report's prose sections.

**What it requires**: LLM API integration, prompt engineering with computed data as context, cost per comparison.

**V1 compatibility**: `summary.ts` has a clean interface (`generateSummary(...) → string`). Swap implementation, same interface.

### FS-6: LLM-Powered Deeper Inferences (Claude API)

**Idea**: After the 15 verdict dimensions are computed, pass the computed data to Claude API to generate deeper strategic inferences — the kind of narrative from Sections 10-13 of the WW vs FRA report (Strengths & Weaknesses, Strategic Recommendations, The Fundamental Question). Goes beyond what formulas can surface.

**What it requires**: Claude API integration (Anthropic SDK), prompt engineering with ComputedReport as context, cost per comparison. Natural pairing with FS-5 (LLM summaries).

**V1 compatibility**: Could be an additional section appended to the report. No existing modules need to change — it consumes the ComputedReport as input.

---

*These future scope items should be revisited after V1 launch. If user feedback doesn't validate them, archive.*
