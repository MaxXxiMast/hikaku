# Plan 3 Brainstorm: Pages + Report UI

**Date**: 2026-04-28
**SDLC Phase**: 1 (Brainstorming)
**Participants**: Purujit Negi + Claude
**Depends on**: Plan 2 (Metrics Engine) — merged via PR #2

---

## Context

Plan 2 delivered the complete metrics computation engine (11 modules, 119 tests). Plan 3 wires it into a working web application: user enters 2 channel handles → sees a full comparison report with charts, tables, and verdict.

The original WW vs FRA analysis (`docs/reference-scripts/channel-comparison-report.md`) is the gold standard for what the report should contain. Key insight from brainstorming: the platform should be a "no-brainer" — user enters channels, gets everything automatically. No configuration, no filters, no mode selection.

---

## Decisions Made

### Decision 1: Comparison Flow — Simple POST → Redirect

**Chosen**: User submits form → POST `/api/compare` → server fetches all videos, computes full report, stores in Convex + Redis → returns `{ reportId }` → client redirects to `/r/{id}`.

**Rejected alternatives**:
- **SSE streaming** — `computeReport` runs in ~1-2s (pure CPU). The slow part is YouTube API fetching (~5-15s). SSE adds major complexity (streaming in Next.js App Router, partial state management, connection recovery) for minimal UX gain. Deferred to post-V1.
- **Two-phase polling** — POST returns `jobId`, client polls status endpoint. More responsive but adds job queue infrastructure. Overkill for V1.

**Rationale**: Total wait is 10-20s — short enough for a well-designed loading screen. Simplest approach that works (KISS).

---

### Decision 2: Channel Count — Locked at 2 for V1

**Chosen**: Landing page shows exactly 2 handle inputs. No add/remove buttons. No 3-4 channel UI.

**Rationale**: Most common use case is 2-channel comparison. Simpler form, simpler report layout (no multi-column responsive headaches). The computation engine already supports 2-4 channels, so expanding the UI later is a form + layout change only — no backend work.

---

### Decision 3: Time Range — No UI Selector, Section-Level Windowing

**Chosen**: No time range selector in the UI. Fetch ALL videos per channel (no `since` filter at the API level). Each report section internally decides its own time window based on what makes the analysis meaningful.

**Section-level windows**:

| Section | Window | Logic |
|---|---|---|
| Channel Overview | All-time | Lifetime stats |
| Engagement Overall | All-time | Aggregate rates across full library |
| Engagement Monthly | Overlapping period | Auto-detect months where ALL channels were active |
| Growth First-N-Months | Age-normalized | `min(channel ages)` → slice each channel's first N months |
| Growth Lifecycle | All-time | Full timeline for phase detection |
| Distribution & Virality | All-time | Gini/percentiles need full library |
| Posting Patterns | All-time | Upload frequency needs full history |
| Title & SEO | All-time | Pattern detection needs volume |
| Categories | All-time | Full library classification |
| Subscriber Efficiency | All-time | Lifetime metric |
| Content Freshness | Last 30 days vs all-time | Already implemented |
| Verdict | Mixed | Each dimension uses the window from its source section |

**Key enrichments needed in computation modules**:
- `computeEngagement` → add overlapping-period monthly sub-analysis
- `computeGrowth` → add first-N-months comparison alongside existing monthly data

**Rejected alternative**: Top-level `since` parameter as a report-wide filter. This can't handle overlapping-period or first-N-months comparisons, which are the most insightful analyses from the original WW vs FRA report.

**Rationale**: The original report compared first-7-months of WW vs first-7-months of FRA (age-normalized) and overlapping months (fairness). A simple date filter can't express these. Section-level windowing makes the platform a "no-brainer" — user enters channels, gets all analysis types automatically.

---

### Decision 4: Loading UX — Rotating Content → Skeleton → Phased Reveal

**Chosen**: Three-phase loading experience:
1. **Submit phase** (10-20s) — Landing page shows loading overlay with rotating content cards (YouTube facts, channel tips, hikaku hints, wabi-sabi quotes cycling every 2-3s) + progress stage text ("Resolving channels...", "Fetching videos...", "Computing metrics...")
2. **Transition** — Response arrives → navigate to `/r/{id}` with skeleton layout
3. **Reveal phase** — Sections populate with fade-in animation (phased reveal, subtle slide-up, 300ms ease)

**Content pool** (from spec Section 9):
```typescript
const LOADING_CONTENT = {
  youtubeFacts: [
    "YouTube has over 800 million videos",
    "500 hours of video are uploaded to YouTube every minute",
    "YouTube is the second-largest search engine in the world",
    "The average YouTube session on mobile lasts over 40 minutes",
    "YouTube reaches more 18-49 year-olds than any cable network",
  ],
  channelTips: [
    "Channels with question-based titles get 22% more views on average",
    "The best posting time on YouTube is between 5-7 PM local time",
    "Videos over 10 minutes generate 2x more watch time",
    "Consistent upload schedules boost algorithmic recommendations",
    "Thumbnails with faces get 38% higher click-through rates",
  ],
  hikakuHints: [
    "Reports are shareable for 6 hours via unique links",
    "Provide your own YouTube API key for unlimited comparisons",
  ],
  wabiSabiQuotes: [
    "In the beginner's mind there are many possibilities — Shunryu Suzuki",
    "Simplicity is the ultimate sophistication — Leonardo da Vinci",
    "The obstacle is the path — Zen proverb",
    "Nothing lasts, nothing is finished, nothing is perfect — Richard Powell",
  ],
}
```

---

### Decision 5: Report Layout — Hybrid (Section-Level)

**Chosen**: Each report section picks the layout pattern that best serves its data type:
- **Side-by-side cards**: Channel Overview, Subscriber Efficiency, Content Freshness
- **Full-width chart**: Monthly Viewership, Engagement trends, Growth area, Distribution bars
- **Full-width table**: Categories, Verdict scorecard
- **Mixed**: Engagement Deep Dive (metrics cards + chart), Posting Patterns (heatmap + stats)

Layout decisions are iterative — will evolve with user feedback. Each section component receives its data prop and owns its layout.

---

### Decision 6: Convex Storage — Immediate on Creation

**Chosen**: API route stores raw + computed in Convex and caches computed in Redis immediately after computation. Every comparison gets persisted. Convex cron purges anonymous reports at 72h.

**Existing infrastructure** (from Plan 1):
- `convex/reports.ts` — `create` mutation, `getPublic` query, `getComputed` query (all ready to use)
- `convex/crons.ts` — expiry and purge jobs (scaffolded, need activation)
- `src/lib/redis.ts` — Upstash client
- `src/lib/rate-limit.ts` — `checkRateLimit(ip, 10, 3600)` (10 req/IP/hour)

---

### Decision 7: Error Handling — Atomic Compute, Graceful Storage

**Chosen**:
- **Strict on input/compute**: If any channel fails to resolve, the whole request fails. If video fetching fails for either channel, the whole request fails. Clear error messages.
- **Graceful on storage**: If Convex or Redis writes fail after computation, still return the report to the client. Log the storage failure but don't block the user.

**Error responses**:
- Channel not found → 404 with handle name
- Rate limited → 429 with retry-after
- YouTube API quota exhausted → 503 with user-friendly message
- Invalid input → 400 with Zod validation errors

---

### Decision 8: PDF Export — Deferred to Plan 4

**Rationale**: Plan 3 is already the largest plan (API route, 12 components, charts, Convex integration, loading UX). PDF is client-side only (`html2canvas + jsPDF`) and can be added without touching existing code. Share URL covers the core sharing need.

---

### Decision 9: OG Images — Included

**Chosen**: Dynamic OG images via `@vercel/og` for social sharing previews. Small, isolated feature (~1 task). A shared link without a preview image looks broken on social media.

**Content**: Channel names + key verdict headline. Kintsugi-styled.

---

### Decision 10: Chart Theming — Props per Chart

**Chosen**: Each chart component receives channel colors as props. Channel A = gold (`#c5a55a`), Channel B = sage (`#8a9a7a`). No `<ChartProvider>` wrapper.

**Deferred**: Chart theme wrapper for when we expand to 3-4 channels (color palette needs to scale).

---

### Decision 11: Chart Types per Section

| Section | Chart Type | Rationale |
|---|---|---|
| Monthly Viewership | Bar chart | Discrete months, bars are clearer than lines |
| Engagement Deep Dive | Combo (bar + line) | Bar for rates, line for monthly trend |
| Growth Trajectory | Area chart | Shows lifecycle phases well with fills |
| View Distribution | Bar chart | Percentile bars + viral threshold bars |
| Production Patterns | CSS grid heatmap | Recharts has no native heatmap; styled divs with intensity colors is simpler |
| Title & SEO | Horizontal bar | Pattern comparison (question vs no-question avg views) |

---

### Decision 12: Analytics — Centralized with Existing Pattern

**Chosen**: Keep existing discriminated union pattern in `src/lib/analytics.ts` (already well-typed with `HikakuEvent` union + `trackEvent` function). Add Plan 3 events to the existing union. The type system enforces correctness at compile time — no string literals scattered across components.

**Events to add/update for Plan 3**:

Events already defined in `analytics.ts` from Plan 1:
- `landing_visited`, `comparison_started`, `comparison_completed`, `comparison_failed`
- `report_viewed`, `report_shared`, `report_expired_viewed`, `report_regenerated`
- `loading_started`, `loading_abandoned`, `loading_completed`

These need no changes — they cover the Plan 3 flow. Implementation just needs to call `trackEvent` at the right places.

---

## Scope Summary

### In Plan 3

- Landing page (2-channel form, validation, optional API key)
- `/api/compare` route (validate → rate limit → fetch → compute → store → return)
- Loading UX (rotating content cards → skeleton → phased reveal)
- `/r/{id}` cached report page (SSR from Redis → Convex fallback)
- `/r/{id}/expired` page + re-generate CTA
- 12 report section components (hybrid layout, 6 with charts)
- Computation enrichment (overlapping period, first-N-months in engagement + growth)
- OG images via `@vercel/og`
- Share button (copy URL to clipboard)
- Analytics events (ADD) — call `trackEvent` at all touchpoints
- Activate Convex cron jobs (expiry + purge)

### Deferred

| Feature | When | Notes |
|---|---|---|
| PDF export | Plan 4 | Client-side html2canvas + jsPDF |
| SSE streaming | Post-V1 | Upgrade from simple POST if wait time is a problem |
| Time range UI selector | Post-V1 | Section-level windowing handles this automatically |
| 3-4 channel UI | Post-V1 | Computation engine ready, UI/layout needs work |
| Chart theme wrapper | With 3-4 channels | Color palette needs to scale |
| Authentication | V1.5 | Schema fields exist, UI gated |
| Save reports / history | V1.5 | Depends on auth |
| LLM-generated summaries | Post-V1 | Template-based for now |

---

## Open Items for Spec/Plan Phase

These don't need brainstorm decisions but need to be specified in the implementation plan:

1. **Phased reveal timing** — exact order and delays for section appearance
2. **Responsive breakpoints** — mobile stacking behavior for each section type
3. **Skeleton component design** — shimmer pattern matching section heights
4. **Convex cron activation** — uncomment and implement the internal mutations in `crons.ts`
5. **Toast for share feedback** — library choice (Sonner is the shadcn default)
6. **Report page sticky elements** — channel name pills on scroll, action bar at bottom
