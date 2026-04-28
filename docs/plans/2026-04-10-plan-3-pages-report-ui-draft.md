# Plan 3: Pages + Report UI — DRAFT

> **Status**: Draft — needs brainstorming session before finalization.
> **Depends on**: Plan 2 (Metrics Engine) must be executed and merged first.

**Goal**: Wire Plan 2's computation engine into a working web application. User enters handles → sees a full comparison report.

**Branch**: `feature/plan-3-pages-report-ui` (from `master`, after Plan 2 merged)

**Spec**: `docs/specs/hikaku-v1-design.md` (Sections 4, 5, 6, 9, 10, 12)

---

## Three Main Pieces

### Piece 1: Landing Page — Channel Input Form

**Files**: `src/app/page.tsx`, `src/components/compare/ChannelInput.tsx`, `src/components/compare/CompareForm.tsx`

**What it does**:
- Replace Plan 1 placeholder landing page with actual comparison form
- 2-4 channel handle fields using React Hook Form + Zod (schemas from `lib/validations.ts`)
- Optional user-provided API key input
- Optional time range selector (maps to `since` param — default 4 months applied here)
- "Compare" button → POST to `/api/compare`
- Validation: handles must start with `@`, 2-4 required, no duplicates

**Design**:
- Kintsugi aesthetic — generous spacing, muted tones, gold accents on interactive elements
- Crimson Pro for heading, Zen Kaku Gothic for inputs/labels
- Mobile: stacked inputs. Desktop: side-by-side with add/remove channel buttons

**Analytics (ADD)**:
- `landing_visited` — already exists from Plan 1
- `comparison_started` — fires on form submit with channel count

**Open questions for brainstorm**:
- How many channels to show by default? (2 with "add channel" button? Or 4 always visible?)
- Show the time range selector in V1 or hide it? (Default 4 months is good for most users)
- Loading state — redirect to `/compare?channels=...` or stay on landing page with inline progress?

---

### Piece 2: API Route — `/api/compare`

**Files**: `src/app/api/compare/route.ts`

**What it does** (step by step):
1. Validate input (2-4 handles, optional apiKey, optional since)
2. Rate limit check via Redis (`lib/rate-limit.ts` — 10 req/IP/hour)
3. Resolve all channels via `resolveChannel` from Plan 2 (atomic fail)
4. Fetch videos via `fetchAllVideos` with `since` (default: 4 months ago)
5. Call `computeReport(channels, videosByChannel, { referenceDate: new Date() })`
6. Generate `reportId` via nanoid
7. Store raw + computed in Convex (`convex/reports.ts` mutations)
8. Cache computed in Redis (4h TTL)
9. Set report as public with 6h expiry (Convex)
10. Track `comparison_completed` event (PostHog)
11. Return `{ reportId, data: ComputedReport }`

**Streaming (SSE)**:
- Use Server-Sent Events to stream progress + sections as they compute
- Events: `progress` (stage updates), `section` (individual report sections), `complete` (final reportId)
- Client renders sections progressively as they arrive

**Error handling**:
- Channel not found → 404 with handle name
- Rate limited → 429 with retry-after
- YouTube API quota exhausted → 503 with user-friendly message
- Invalid input → 400 with Zod validation errors

**Open questions for brainstorm**:
- SSE vs response streaming vs WebSocket? (SSE is simplest, spec says SSE)
- Should sections stream individually or in the two-phase batches (Phase 1 sections, then Phase 2)?
- How to handle partial computation failure? (One module throws but others succeed)

---

### Piece 3: Report Pages

#### 3a. Live Comparison — `/compare`

**Files**: `src/app/compare/page.tsx`, `src/components/report/*.tsx`

**What it does**:
- Receives SSE stream from `/api/compare`
- Renders sections progressively as they arrive (phased reveal)
- Loading skeletons for pending sections
- Share button appears after `complete` event
- URL updates to `/r/{reportId}` after completion (history.replaceState)

**Phased reveal order** (from spec Section 9):
```
[0s]  Executive Summary + Channel Overview
[~3s] Engagement Deep Dive
[~5s] Monthly Viewership + Growth Trajectory
[~8s] View Distribution + Production Patterns
[~12s] Title/SEO + Categories
[~15s] Subscriber Efficiency + Content Freshness
[~16s] Head-to-Head Verdict
```

#### 3b. Cached Report — `/r/[id]`

**Files**: `src/app/r/[id]/page.tsx`

**What it does**:
- SSR page — fetches report from Redis (fast) → Convex fallback (source of truth)
- Renders all 12 sections at once (no streaming, report is already computed)
- OG metadata for social sharing (`@vercel/og` for dynamic images)
- Share button with copy-to-clipboard

#### 3c. Expired Report — `/r/[id]/expired`

**Files**: `src/app/r/[id]/expired/page.tsx`

**What it does**:
- Shown when public link has expired (6h)
- Displays channel handles from URL or Convex metadata
- "Re-generate comparison" CTA button → redirects to landing with handles pre-filled

---

## 12 Report Section Components

Each follows the presentational + hooks pattern: `data` prop in, JSX out. No data fetching inside.

| # | Component | Data Prop | Chart Type | Key Elements |
|---|-----------|-----------|------------|-------------|
| 1 | `ExecutiveSummary` | `executiveSummary: string` | None | Styled text block |
| 2 | `ChannelOverview` | `overview: ChannelOverviewData[]` | None | Side-by-side cards (avatar, subs, views, top video) |
| 3 | `MonthlyViewership` | `monthlyViewership: MonthlyData[]` | Recharts line/bar | MoM trend per channel, color-coded |
| 4 | `EngagementDeepDive` | `engagement: EngagementData` | Recharts bar + line | Overall rates, monthly trend, duration breakdown, top engaged |
| 5 | `GrowthTrajectory` | `growth: GrowthData` | Recharts area | Lifecycle phases, first-N-months overlay |
| 6 | `ViewDistribution` | `distribution: DistributionData` | Recharts scatter/bar | Percentile chart, viral threshold bars, Gini indicator |
| 7 | `ProductionPatterns` | `postingPatterns: PostingPatternsData` | Recharts heatmap | Day/hour heatmap, upload frequency, duration sweet spot |
| 8 | `TitleSeoAnalysis` | `titleAnalysis: TitleAnalysisData` | Recharts bar | Pattern comparison bars, top tags cloud/list |
| 9 | `CategoryBreakdown` | `categories: CategoryData[]` | Table | Category performance table (shadcn Table) |
| 10 | `SubscriberEfficiency` | `subscriberEfficiency: SubscriberEfficiencyData` | None | Metric cards (views/sub, views/sub/video) |
| 11 | `ContentFreshness` | `contentFreshness: ContentFreshnessData` | Recharts bar | Recent vs all-time comparison bars, delta % |
| 12 | `HeadToHeadVerdict` | `verdict: VerdictData` | Table | 15-dimension scorecard with winner dots, margin, notes |

**Shared patterns**:
- Each channel gets a color: A = gold (#c5a55a), B = sage (#8a9a7a), C/D from palette
- Loading skeleton per section (shimmer, matches section height)
- Responsive: mobile stacks vertically, desktop shows side-by-side where applicable
- Subtle fade-in animation on reveal (no bounce/spring per design rules)

---

## Sharing + Social

- **Share button**: Copies `hikaku.app/r/{reportId}` to clipboard, shows toast (Sonner)
- **OG image**: Dynamic via `@vercel/og` — channel names + key verdict dimensions
- **PDF export**: Client-side via `html2canvas` + `jsPDF` — "Download PDF" button
- **6h expiry**: Convex scheduled job flips `isPublic` flag, redirects to expired page

---

## Data Flow Summary

```
Landing Page
    ↓ POST /api/compare { channels, apiKey?, since? }
API Route
    ↓ resolveChannel × N (forHandle, atomic fail)
    ↓ fetchAllVideos × N (since param)
    ↓ computeReport (Plan 2 orchestrator)
    ↓ Store in Convex + cache in Redis
    ↓ SSE stream progress + sections
/compare (live)
    ↓ Phased reveal of 12 sections
    ↓ history.replaceState → /r/{reportId}
/r/{id} (cached)
    ↓ SSR from Redis/Convex
    ↓ Full report rendered
/r/{id}/expired
    ↓ Re-generate CTA
```

---

## Analytics (ADD)

| Event | When | Properties |
|-------|------|-----------|
| `landing_visited` | Page load (exists from Plan 1) | — |
| `comparison_started` | Form submit | channelCount, hasCustomKey, hasCustomSince |
| `comparison_completed` | Report ready | channelCount, reportId, computeTimeMs |
| `comparison_failed` | Error response | errorType, channelCount |
| `report_viewed` | /r/[id] page load | reportId, isOwner |
| `report_shared` | Share button click | reportId, method (copy/pdf) |
| `report_expired_viewed` | /r/[id]/expired load | reportId |
| `report_regenerated` | Re-generate CTA click | reportId, channelHandles |

---

## What's NOT in Plan 3

- Authentication / user accounts (V1.5)
- Save reports / search history (V1.5)
- LLM-generated inferences (FS-6)
- Custom report configurations (V1.5)
- 3-4 channel UI (start with 2, "add channel" deferred or simple)

---

## Estimated Chunks (rough)

| Chunk | What | Complexity |
|-------|------|-----------|
| 1 | Landing page form + validation | Medium |
| 2 | `/api/compare` route + SSE streaming | High |
| 3 | Report page layout + phased reveal | High |
| 4 | 6 simpler section components (overview, summary, efficiency, freshness, categories, verdict table) | Medium |
| 5 | 6 chart-heavy section components (monthly, engagement, growth, distribution, patterns, titles) | High |
| 6 | Sharing (OG, PDF, copy, expiry) | Medium |
| 7 | Cached report page + expired page | Low |
| 8 | Responsive + polish | Medium |

---

## Open Questions for Brainstorm

1. **Channel count UX**: Start with 2 inputs + "add channel" button? Or show 4 always?
2. **Time range UI**: Show selector in V1? Or hide and use 4-month default?
3. **SSE implementation**: Next.js App Router SSE — ReadableStream in route handler?
4. **Phased reveal**: Stream individual sections or batch by computation phase?
5. **Chart library setup**: Recharts theme wrapper for Kintsugi colors? Or pass colors per chart?
6. **Heatmap for posting patterns**: Recharts doesn't have a native heatmap — custom component or different visualization?
7. **PDF export timing**: Available during streaming or only after all sections loaded?
8. **Mobile chart behavior**: Scroll horizontally or simplify charts to tables on mobile?
9. **Error recovery**: If one section fails to render, show error placeholder or hide the section?
10. **Loading performance**: Lazy load chart components? (Recharts is heavy)

---

*This draft needs a proper brainstorm session (SDLC Phase 1) before ADRs, spec updates, and implementation planning.*
