# Hikaku V1 — Product Design Specification

**Status**: Draft (revised 2026-03-17 — Convex backend, analytics, 6h expiry, data lifecycle)
**Date**: 2026-03-16
**Author**: Purujit Negi + Claude (AI pair)
**ADRs**: [001](../adrs/001-tech-stack-nextjs-vercel.md) through [012](../adrs/012-analytics-driven-development.md)

---

## 1. Product Overview

### 1.1 What

Hikaku (比較) is a YouTube channel comparison platform. Users enter 2-4 YouTube channel handles and receive a comprehensive side-by-side analysis covering engagement, growth, content strategy, posting patterns, SEO, and more.

### 1.2 Why

YouTube analytics tools either cost money (Social Blade Pro, VidIQ Pro) or provide surface-level data (subscriber count, total views). No free tool generates a deep, shareable comparison report with actionable insights. Hikaku fills that gap.

### 1.3 For Whom

- Content creators benchmarking against competitors
- Marketing teams analyzing influencer channels
- Investors evaluating media companies
- Curious individuals comparing channels they follow

### 1.4 Origin

Built from a real analysis comparing Wint Wealth (@WintWealthYT, 729K subs) vs Fixed Returns Academy (@FixedReturnsAcademy, 1.3K subs) for Grip Invest. The scripts and methodology are proven against real YouTube data.

---

## 2. Tech Stack

| Layer | Choice | Purpose | ADR |
|-------|--------|---------|-----|
| Framework | Next.js 15 (App Router, React 19) | SSR, routing, API routes | [ADR-001](../adrs/001-tech-stack-nextjs-vercel.md) |
| Styling | Tailwind CSS v4 + shadcn/ui | Design system, components | [ADR-007](../adrs/007-component-library-shadcn.md) |
| Charts | Recharts | Data visualization | — |
| Persistent Backend | Convex | Users, auth, reports, AI personalization, vector search | [ADR-011](../adrs/011-backend-convex-ai-first.md) |
| Cache Layer | Upstash Redis | Hot cache (4h TTL), rate limiting, ephemeral state | [ADR-002](../adrs/002-database-upstash-redis.md) |
| Hosting | Vercel | Edge hosting, serverless | [ADR-001](../adrs/001-tech-stack-nextjs-vercel.md) |
| Display Font | Crimson Pro (Google Fonts, SIL OFL) | Kanji logotype, section headings | [ADR-003](../adrs/003-design-system-kintsugi-wabi-sabi.md) |
| Body Font | Zen Kaku Gothic New (Google Fonts, SIL OFL) | UI, data, tables, labels | [ADR-003](../adrs/003-design-system-kintsugi-wabi-sabi.md) |
| PDF Export | html2canvas + jsPDF (client-side) | Report download | — |
| OG Images | @vercel/og + next/image | Social previews, thumbnails | [ADR-010](../adrs/010-image-service-evaluation.md) |
| Product Analytics | PostHog | Events, funnels, session replays | [ADR-012](../adrs/012-analytics-driven-development.md) |
| Web Vitals | Vercel Analytics | Performance monitoring | — |
| Forms | React Hook Form + Zod | Form state, shared client+server validation | [ADR-013](../adrs/013-frontend-state-and-forms.md) |
| Server State | Convex hooks (useQuery/useMutation) | Reactive, auto-typed, no TanStack Query | [ADR-013](../adrs/013-frontend-state-and-forms.md) |
| Client State | Component-local + next-themes | No global state library (YAGNI) | [ADR-013](../adrs/013-frontend-state-and-forms.md) |
| API Middleware | Composable utilities (withValidation, withRateLimit) | Lightweight, typed, no framework | [ADR-013](../adrs/013-frontend-state-and-forms.md) |

---

## 3. Design System

Full details in [ADR-003](../adrs/003-design-system-kintsugi-wabi-sabi.md).

### 3.1 Philosophy — Wabi-Sabi (侘寂)

Beauty in imperfection, transience, simplicity. Applied to UI:
- Generous negative space — data breathes
- Muted earth tones — no neon, no gradients
- Thin typography — quiet authority
- Organic warmth — not clinical

### 3.2 Color Tokens

#### Kintsugi Dark (Default)

```css
--background: #121210;
--surface: #1a1a18;
--accent-gold: #c5a55a;
--accent-sage: #8a9a7a;
--text-primary: #d4cfc5;
--text-muted: #7a756c;
--border: rgba(197, 165, 90, 0.12);
--divider: linear-gradient(to right, transparent, rgba(197, 165, 90, 0.2), transparent);
```

#### Washi Gold V2 Light

```css
--background: #f5f1ea;
--surface: #fdfcf8;
--accent-gold: #856b1e;
--accent-sage: #4d6a3a;
--text-primary: #1e1b16;
--text-muted: #918c82;
--border: rgba(133, 107, 30, 0.15);
--divider: linear-gradient(to right, transparent, rgba(133, 107, 30, 0.15), transparent);
```

#### Channel Color Assignments

| Slot | Dark Mode | Light Mode | Usage |
|------|-----------|------------|-------|
| Channel A | #c5a55a (gold) | #856b1e | Primary channel |
| Channel B | #8a9a7a (sage) | #4d6a3a | Second channel |
| Channel C | #b07a5a (copper) | #7a5530 | Third channel (when 3-4) |
| Channel D | #7a8aa0 (steel blue) | #4a5a70 | Fourth channel (when 4) |

### 3.3 Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Display / Kanji | Crimson Pro | 200, 300, 400, 600 | Logotype (比較), section headings |
| Body / Data | Zen Kaku Gothic New | 300, 400, 500, 700 | UI text, tables, metrics, labels |

#### Scale

| Size | Token | Usage |
|------|-------|-------|
| 2rem | `--text-display` | Page title (比較) |
| 1.4rem | `--text-heading` | Section headings |
| 1rem | `--text-body` | Body text |
| 0.8rem | `--text-data` | Table data, metrics |
| 0.65rem | `--text-label` | Labels, tags, captions |
| 0.55rem | `--text-micro` | Mode labels, fine print |

### 3.4 Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 0.25rem | Inline spacing |
| `--space-sm` | 0.5rem | Tight grouping |
| `--space-md` | 1rem | Card padding, element gaps |
| `--space-lg` | 1.5rem | Section padding |
| `--space-xl` | 2rem | Section gaps |
| `--space-2xl` | 3rem | Major section separation |

### 3.5 Component Overrides (shadcn/ui)

| Component | Override |
|-----------|---------|
| Button | Gold accent, 4px radius, Zen Kaku font, no shadow |
| Input | Gold focus ring, muted placeholder, 4px radius |
| Card | 1px border at 12% opacity, no shadow, generous padding (1.5rem) |
| Table | Gold header text, subtle row dividers, alternating row opacity |
| Tabs | Gold underline indicator, Zen Kaku labels |
| Dialog | Warm overlay (dark: rgba(18,18,16,0.8) / light: rgba(30,27,22,0.4)) |

---

## 4. Pages & Routes

### 4.1 Landing Page — `/`

**Purpose**: Input 2-4 YouTube channel handles and initiate comparison.

**Elements**:
- Logo: 比較 (Crimson Pro) + HIKAKU (Zen Kaku Gothic)
- Tagline: "Compare · Understand · Decide"
- Input fields: 2 channel handle inputs by default, "Add channel" button (max 4)
- "Compare" button (gold accent)
- Optional: "Use your own API key" expandable section
- Theme toggle (sun/moon)
- Footer: minimal — "Built with wabi-sabi" + GitHub link

**Behavior**:
- Channel handles validated on blur (@ prefix auto-added)
- Minimum 2 channels required to submit
- On submit: POST /api/compare → redirect to /compare with streaming data

**Responsive**:
- Mobile: stacked inputs, full-width button
- Desktop: horizontal input row with inline button

### 4.2 Comparison Page — `/compare?channels=@a,@b`

**Purpose**: Display the full analysis with phased reveal.

**Loading Experience**:
1. Progress bar at top of page (gold gradient)
2. Below progress bar: rotating content panel
   - YouTube facts, channel tips, Hikaku hints, wabi-sabi quotes, progress updates
3. Sections slide in as computed (fade-up animation, 300ms ease)

**Phased Reveal Order**:
```
[0s]   Loading screen with facts
[~2s]  Channel Overview cards appear
[~4s]  Executive Summary appears
[~6s]  MoM Viewership chart appears
[~8s]  Engagement section appears
[~10s] Growth + Distribution appear
[~12s] Posting Patterns + Title/SEO appear
[~14s] Content Categories + Subscriber Efficiency appear
[~16s] Freshness + Verdict appear
[~16s] Share/Download bar slides up
```

**Sticky Elements**:
- Top: Channel name pills (scrolled past overview, shows which channels)
- Bottom: Action bar — "Share Report" + "Download PDF" buttons

**Responsive**:
- Mobile: single column, sections stacked, charts full-width
- Tablet: 2-column for 2 channels, scrollable for 3-4
- Desktop: side-by-side cards matching channel count

### 4.3 Report Page — `/r/[id]`

**Purpose**: Shareable report. Same layout as /compare but reads from Convex.

**Server-Side**:
- `generateMetadata()` reads Convex for OG tags
- Title: "Hikaku — @channelA vs @channelB"
- Description: auto-generated executive summary
- OG image: dynamic social card via @vercel/og

**Behavior**:
- If report exists and is public (within 6h): render full report (SSR, hot cache from Redis)
- If report link expired (>6h): redirect to `/r/[id]/expired?ch=@a,@b`
- If report ID invalid: 404 page
- If logged-in user's saved report: always accessible regardless of expiry

**Elements**:
- Same as /compare but with "Report generated X hours ago" timestamp
- "Expires in Y hours" indicator (gold, counts down) — only for public shared links
- Share + Download buttons
- "Save to account" button (if logged in, report not yet saved)

### 4.4 Expired Report — `/r/[id]/expired`

**Purpose**: Convert expired link visitors into new users.

**Elements**:
- Message: "This report has expired"
- Channel list: "Compared: @channelA vs @channelB vs ..." (from URL params)
- CTA: "Re-generate this comparison" (gold button, links to /compare with pre-filled channels)
- CTA: "Start a new comparison" (secondary button, links to /)
- Wabi-sabi quote about impermanence

**Future**: Re-generate CTA becomes a paid feature.

---

## 5. Report Sections — Detailed Specification

Each section is an independent React component that receives computed data as props. All sections must handle 2, 3, or 4 channel layouts.

### 5.1 Executive Summary

**Data**: Auto-generated from computed metrics.
**Display**: 3-4 bullet points summarizing key findings.
**Example**: "Wint Wealth dominates on scale (900x more views) but FRA wins on engagement quality (3.8x comment rate). Both channels are declining — WW at -91.6% vs all-time, FRA at -34.3%."
**Component**: `<ExecutiveSummary />`

### 5.2 Channel Overview

**Data**: Per-channel stats — subscribers, total views, video count, channel age, avg views/video, top video.
**Display**: Side-by-side cards (1 per channel). Each card shows key metrics with channel-colored accents.
**Component**: `<ChannelOverview />`
**Includes**: Subscriber Efficiency metrics (views/sub, views/sub/video)

### 5.3 Month-on-Month Viewership

**Data**: Monthly aggregation — videos published, total views, avg views/video, MoM change %.
**Display**: Multi-line chart (one line per channel) + data table below.
**Chart**: Recharts `<LineChart>` with channel colors, gold grid lines, muted axis labels.
**Component**: `<MonthlyViewership />`

### 5.4 Engagement Deep Dive

**Data**: Overall rates (engagement, like, comment), monthly engagement trend, engagement by duration, top engaged videos.
**Display**: Metrics cards at top, monthly trend chart, duration breakdown table, top engaged videos list.
**Component**: `<EngagementDeepDive />`

### 5.5 Growth Trajectory

**Data**: First-N-months comparison, lifecycle phases, cumulative growth.
**Display**: Phase timeline, first-N-months table, avg views/video trend chart.
**Component**: `<GrowthTrajectory />`

### 5.6 View Distribution & Virality

**Data**: Percentiles (P10-P95), mean/median ratio, Gini coefficient, viral thresholds.
**Display**: Distribution stats cards, viral threshold bars (% of videos >= 1K, 10K, 100K, 1M).
**Component**: `<ViewDistribution />`

### 5.7 Production Patterns

**Data**: Upload frequency, day-of-week performance, hour-of-day performance, duration sweet spot.
**Display**: Upload consistency metrics, day heatmap, hour heatmap, duration performance table.
**Chart**: Heatmap using Recharts `<ScatterChart>` or custom grid.
**Component**: `<ProductionPatterns />`

### 5.8 Title & SEO Analysis

**Data**: Title patterns (question %, emoji %, number %), avg title length, top tags.
**Display**: Pattern performance table, tag cloud or top tags list.
**Component**: `<TitleSeoAnalysis />`

### 5.9 Content Category Breakdown

**Data**: Per-category video count, total views, avg views, engagement rate, top video.
**Display**: Sortable table with category bars. Categories auto-classified from video titles.
**Component**: `<ContentCategories />`

### 5.10 Content Freshness

**Data**: Last 30 days vs all-time — video count, avg views, delta %.
**Display**: Comparison cards showing recent performance trend.
**Component**: `<ContentFreshness />`

### 5.11 Head-to-Head Verdict

**Data**: Multi-dimension scorecard — which channel wins each dimension.
**Display**: Table with dimensions, winner indicator (channel color dot), margin, notes.
**Dimensions**: Scale, Engagement Quality, Content-Product Fit, Growth Trajectory, Upload Strategy, SEO, Subscriber Efficiency, Duration Strategy, Title Optimization, Posting Optimization, Content Freshness, Brand Building, Viral Potential, Audience Depth.
**Component**: `<HeadToHeadVerdict />`

---

## 6. API Routes

### 6.1 POST /api/compare

**Input**:
```typescript
{
  channels: string[]       // 2-4 YouTube handles
  apiKey?: string          // Optional user-provided YouTube API key
}
```

**Process**:
1. Validate input (2-4 handles, rate limit check via Redis)
2. Resolve handles to channel IDs (YouTube search API)
3. Fetch channel stats (YouTube channels API)
4. Fetch all videos via uploads playlist (YouTube playlistItems + videos APIs)
5. Compute all metrics (engagement, categories, distribution, patterns, etc.)
6. Store raw + computed data in Convex (source of truth)
7. Cache computed metrics in Redis (hot cache, 4h TTL)
8. Set report as public with 6h expiry (Convex scheduled job)
9. If logged in: save to user's search history in Convex
10. Track `comparison_completed` event (PostHog)
11. Return report ID + computed data

**Output**:
```typescript
{
  reportId: string         // nanoid for shareable URL
  data: ComputedReport     // Full computed metrics
}
```

**Streaming**: Use Server-Sent Events (SSE) to stream progress updates:
```
event: progress
data: { stage: "resolving", message: "Resolving channel handles..." }

event: progress
data: { stage: "fetching", message: "Fetching 239 videos for Wint Wealth..." }

event: section
data: { section: "overview", data: { ... } }

event: section
data: { section: "engagement", data: { ... } }

event: complete
data: { reportId: "abc123" }
```

**Rate Limiting**: 10 requests per IP per hour.

### 6.2 GET /api/report/[id]

**Input**: Report ID from URL param.

**Process**:
1. Check Redis hot cache first (fast path)
2. If cache miss: fetch from Convex (source of truth)
3. If report exists and is public (or user owns it): return data, refresh Redis cache
4. If report link expired: return 404 with channel handles (from URL params or Convex metadata)
5. Track `report_viewed` event (PostHog)

**Output**:
```typescript
{
  found: boolean
  data?: StoredReport       // raw + computed + meta
  channelHandles?: string[] // For re-generation
}
```

---

## 7. Data Types

### 7.1 Raw Video Data (stored in Convex)

```typescript
interface RawVideo {
  id: string
  title: string
  publishedAt: string        // ISO 8601
  views: number
  likes: number
  comments: number
  durationSec: number
  tags: string[]
}
```

### 7.2 Raw Channel Data (stored in Convex)

```typescript
interface RawChannel {
  id: string
  title: string
  handle: string
  subscriberCount: number
  totalViews: number
  videoCount: number
  joinedDate: string         // ISO 8601
  uploadsPlaylistId: string
}
```

### 7.3 Computed Report (stored in Convex + cached in Redis)

```typescript
interface ComputedReport {
  meta: {
    generatedAt: string
    channelHandles: string[]
  }
  overview: ChannelOverviewData[]
  monthlyViewership: MonthlyData[]
  engagement: EngagementData
  growth: GrowthData
  distribution: DistributionData
  postingPatterns: PostingPatternsData
  titleAnalysis: TitleAnalysisData
  categories: CategoryData[]
  subscriberEfficiency: SubscriberEfficiencyData
  contentFreshness: ContentFreshnessData
  verdict: VerdictData
  executiveSummary: string
}
```

### 7.4 Convex Report Document (source of truth)

```typescript
// convex/schema.ts
reports: defineTable({
  // Metadata
  channelHandles: v.array(v.string()),
  generatedAt: v.number(),
  generatedBy: v.optional(v.id("users")),  // null for anonymous

  // Visibility
  isPublic: v.boolean(),        // true for 6h after creation
  publicExpiresAt: v.number(),  // timestamp when public link expires

  // Lifecycle
  savedBy: v.optional(v.id("users")),  // if a logged-in user saved it
  purgeAfter: v.optional(v.number()),  // 72h for unsaved, null for saved

  // Data
  raw: v.object({
    channels: v.array(v.any()),
    videos: v.array(v.any()),
  }),
  computed: v.any(),  // ComputedReport
})
  .index("by_public", ["isPublic", "publicExpiresAt"])
  .index("by_user", ["savedBy"])
  .index("by_purge", ["purgeAfter"])
```

### 7.5 Data Lifecycle

```
Anonymous user:
  Report created → isPublic: true, publicExpiresAt: now + 6h, purgeAfter: now + 72h
  → 6h: Convex cron flips isPublic to false (link expires)
  → 72h: Convex cron deletes raw + computed data (metadata kept for analytics)

Logged-in user (unsaved):
  Same as anonymous

Logged-in user (saved):
  Report created → isPublic: true, publicExpiresAt: now + 6h, savedBy: userId, purgeAfter: null
  → 6h: Public link expires, but user can still access from dashboard
  → Data persists permanently (enables AI re-analysis, history)
  → User can delete from dashboard
```

### 7.6 Redis Cache Structure (hot cache only)

```
report:{id}:computed → ComputedReport JSON (4h TTL)
ratelimit:{ip} → counter (1h TTL)
```

Redis stores ONLY computed metrics for fast reads on popular reports. Source of truth is always Convex.

---

## 8. Metrics Computation Engine

Ported from the proven analysis scripts built for the WW vs FRA comparison. Source scripts in the gi-client-web repo:

| Script | Target Module | Computation |
|--------|--------------|-------------|
| youtube-channel-stats.mjs | lib/youtube/client.ts | Channel resolution, video fetching, monthly aggregation |
| youtube-video-breakdown.mjs | lib/youtube/categories.ts | Category classification, duration analysis, title patterns |
| engagement-comparison.mjs | lib/youtube/engagement.ts | Engagement rates, monthly trends, duration breakdown |
| deep-inference.mjs | lib/youtube/distribution.ts | Gini, percentiles, viral thresholds, posting patterns, SEO |

### 8.1 Category Classification

Keyword-based classification from video titles (same logic as proven scripts):

| Category | Title Keywords |
|----------|---------------|
| Taxation | tax, taxed, taxation |
| Income Strategy | passive income, monthly income, bond ladder |
| FD Comparison | fd, fixed deposit |
| Risk/Safety | credit rating, safe |
| Bond Basics | ytm, coupon, yield, face value |
| Asset Comparison | debt fund, mutual fund, stock, equity, gold, real estate |
| Macro/RBI | rbi, repo, interest rate, rate cut |
| Bond Types | ncd, corporate bond, government, sovereign, g-sec, sgb |
| Educational | how to, beginner, what is, what are, explained, guide |
| Myths/Mistakes | mistake, avoid, myth, truth, wrong, never |
| Comparison | vs, better, comparison |
| Shorts | #, short |

**Note**: These categories were designed for finance channels. For V1, the same classification runs. Future: ML-based or LLM-based classification for arbitrary channel types.

### 8.2 Engagement Formula

```
Engagement Rate = (likes + comments) / views * 100
```

Per-video, per-month, per-category, and per-duration-bucket.

### 8.3 Distribution Metrics

```
Gini = sum((2i - n - 1) * value_i) / (n^2 * mean)
```

Where values are sorted ascending. 0 = perfectly equal, 1 = all views on one video.

### 8.4 Executive Summary Generation

Auto-generated from computed metrics using template:

```
"[Channel A] dominates on [top metric] ([value]) but [Channel B] wins on
[Channel B's strength] ([value]). [Trend observation]. [Key insight]."
```

For V1, template-based. Future: LLM-generated summaries using raw data.

---

## 9. Loading & UX

Full details in [ADR-008](../adrs/008-loading-and-ux-strategy.md).

### 9.1 Loading Content Pool

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
    "You can compare up to 4 channels at once",
    "Reports are shareable for 6 hours via unique links",
    "Download your report as PDF for permanent access",
    "Provide your own YouTube API key for unlimited comparisons",
  ],
  wabiSabiQuotes: [
    "In the beginner's mind there are many possibilities -- Shunryu Suzuki",
    "Simplicity is the ultimate sophistication -- Leonardo da Vinci",
    "The obstacle is the path -- Zen proverb",
    "Nothing lasts, nothing is finished, nothing is perfect -- Richard Powell",
  ],
}
```

### 9.2 Progress Stages

| Stage | Message | Duration |
|-------|---------|----------|
| resolving | "Resolving channel handles..." | ~1-2s |
| fetching | "Fetching {n} videos for {channel}..." | ~2-8s per channel |
| computing | "Computing engagement metrics..." | ~1s |
| categorizing | "Analyzing content categories..." | ~1s |
| patterns | "Detecting posting patterns..." | ~1s |
| finalizing | "Generating report..." | ~1s |

---

## 10. Sharing & Social

### 10.1 Shareable URL

Format: `hikaku.app/r/{nanoid}?ch=@channelA,@channelB`

- `nanoid` (8 chars) for short, clean URLs
- `ch` param preserves channel handles for re-generation after expiry

### 10.2 OG Meta Tags (SSR)

```html
<meta property="og:title" content="Hikaku -- @WintWealthYT vs @FixedReturnsAcademy" />
<meta property="og:description" content="729K vs 1.3K subscribers. WW leads on scale but FRA wins on engagement." />
<meta property="og:image" content="hikaku.app/r/abc123/opengraph-image" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
```

### 10.3 Dynamic OG Image

Generated via `@vercel/og` at `/r/[id]/opengraph-image.tsx`:
- Kintsugi dark background
- Channel names + key metrics (subs, views, engagement)
- Hikaku logo
- 1200x630px

### 10.4 PDF Export

Client-side generation:
1. User clicks "Download PDF"
2. `html2canvas` captures the report DOM
3. `jsPDF` assembles pages
4. Downloaded as `hikaku-report-{channels}-{date}.pdf`

---

## 11. Error Handling

| Error | User Experience |
|-------|----------------|
| Invalid channel handle | Inline error: "Channel not found. Check the handle and try again." |
| Private/deleted channel | Skip with note: "1 channel was private or deleted and excluded." |
| YouTube API quota exceeded | "We've hit our daily limit. Provide your own YouTube API key to continue." |
| Network failure | Retry button with message: "Connection lost. Click to retry." |
| Channel with 0 videos | Exclude from comparison with note |
| Rate limited | "Too many requests. Please wait {n} minutes." |
| Redis unavailable | Serve directly from Convex (slower but functional, Redis is just a cache) |
| Convex unavailable | Show error: "Our servers are temporarily unavailable. Please try again." |

---

## 12. Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Single column, stacked cards, full-width charts |
| Tablet | 640-1024px | 2-column for 2 channels, horizontal scroll for 3-4 |
| Desktop | > 1024px | Side-by-side cards matching channel count (2-4 columns) |

### Layout Adaptation

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Channel Overview | Stacked cards with swipe | Side-by-side cards |
| Data Tables | Horizontal scroll | Full table |
| Charts | Full width, aspect ratio maintained | Flexible width |
| Verdict Scorecard | Stacked rows | Full comparison table |
| Action Bar | Fixed bottom, full width | Fixed bottom, centered |

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Cumulative Layout Shift | < 0.1 |
| Report load (from Redis) | < 500ms |
| Full comparison generation | < 20s for 4 channels |

---

## 14. Security

| Concern | Mitigation |
|---------|-----------|
| API key exposure | Server-side proxy only. Keys never reach client. |
| Rate limiting | Per-IP via Redis, 10 req/hour on /api/compare |
| Input validation | Sanitize channel handles. Reject non-alphanumeric (except @, _, -). |
| Convex access | Convex functions enforce auth checks. Public queries expose only public reports. |
| Redis injection | Parameterized keys (report:{nanoid}). No user input in key construction. |
| XSS | React default escaping. No raw HTML injection. All content rendered via React components. |
| CORS | API routes restricted to same-origin. |
| Data privacy | Anonymous report data purged at 72h. User data deletable on request. |

---

## 15. Future Considerations (NOT in V1)

These are explicitly out of scope for V1 but documented for future planning:

| Feature | Trigger | Complexity | Notes |
|---------|---------|------------|-------|
| User accounts / auth (V1.5) | Post-launch, when save/history features ready | Medium | Convex + Clerk already in architecture |
| Payment / billing | When freemium gate activated | Medium | Stripe + Convex |
| AI-generated insights | When raw data + LLM integration ready | High | Raw data in Convex enables this |
| Custom report sections | When AI customization feature built | High | User prefs in Convex, raw data available |
| Historical tracking | When users want to track channels over time | Medium | Convex already stores report history for saved reports |
| Astro extraction for /r/ pages | When report pages are highest traffic | Medium | Read-only pages, can share Convex/Redis |
| ML-based category classification | When non-finance channels are common | High | Replace keyword classifier |
| LLM-generated executive summaries | When template summaries feel limiting | Medium | Raw data in Convex feeds LLM |
| Image service (ImageKit or alt) | When next/image limits hit or user uploads needed | Low | Evaluate at that time, see ADR-010 |
| Multi-language support | When international users grow | Medium | — |
| Embed widget | When blogs/sites want to embed comparisons | Low | — |

---

## 16. Development Approach

### 16.1 AI-First

- CLAUDE.md provides full context for every session
- ADRs document every architectural decision with rationale
- This spec is the single source of truth for product requirements
- shadcn/ui chosen for AI ecosystem compatibility (MCP servers, training data)
- Convex chosen for AI development velocity (fewer files per feature, end-to-end TypeScript)
- All components designed with clear interfaces for AI-generated code
- Goal: reach near no-code feature implementation through AI agents

### 16.2 TDD (Test-Driven Development)

Every feature follows:
1. **Red**: Write a failing test
2. **Green**: Write minimum code to pass
3. **Refactor**: Clean up while keeping tests green

Test categories:
- **Unit**: Metric computations, data transformations, utility functions
- **Component**: Report section rendering, loading states, responsive layouts
- **Integration**: API routes, Convex functions, Redis operations, YouTube API mocking
- **E2E**: Full comparison flow (Playwright)

### 16.3 ADD (Analytics-Driven Development)

Every feature ships with analytics instrumentation. Full details in [ADR-012](../adrs/012-analytics-driven-development.md).

1. **Define**: What metric proves this feature works?
2. **Instrument**: Add typed PostHog events alongside the code
3. **Ship**: Deploy feature + analytics together
4. **Verify**: Confirm data flows in PostHog dashboard

Every PR includes: **Code + Tests (TDD) + Analytics events (ADD)**

Key funnels:
- Core: landing → compare → report → share
- Viral: share → opened → new comparison
- Conversion: view → signup → save
- Loading: started → (by stage) → abandoned/completed
- Expiry: expired viewed → regenerated

### 16.4 Git Workflow

- Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- PR reviews before merge to main
- CI: lint + typecheck + test on every PR

---

## 17. Project Structure

```
hikaku/
├── .claude/
│   └── CLAUDE.md                # AI project instructions
├── docs/
│   ├── adrs/                    # Architecture Decision Records (001-012)
│   ├── brainstorm/              # Session capture notes
│   ├── decisions/               # Decision log
│   └── specs/                   # Product specifications (this file)
├── convex/                      # Convex backend (persistent layer)
│   ├── schema.ts                # Data schema (TypeScript, source of truth)
│   ├── reports.ts               # Report queries/mutations
│   ├── users.ts                 # User queries
│   ├── history.ts               # Search history mutations/queries
│   └── crons.ts                 # Scheduled jobs (6h link expiry, 72h data purge)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, theme provider, fonts, ConvexProvider
│   │   ├── page.tsx             # Landing page
│   │   ├── compare/
│   │   │   └── page.tsx         # Live comparison view
│   │   ├── r/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx     # Report view (SSR from Convex/Redis)
│   │   │   │   ├── opengraph-image.tsx  # Dynamic OG image
│   │   │   │   └── expired/
│   │   │   │       └── page.tsx # Expired report + re-gen CTA
│   │   └── api/
│   │       ├── compare/
│   │       │   └── route.ts     # YouTube API proxy + compute + SSE
│   │       └── report/
│   │           └── [id]/
│   │               └── route.ts # Fetch report (Redis cache → Convex fallback)
│   ├── lib/
│   │   ├── youtube/
│   │   │   ├── client.ts        # YouTube Data API v3 client
│   │   │   ├── metrics.ts       # Core metrics computation
│   │   │   ├── categories.ts    # Category classification
│   │   │   ├── engagement.ts    # Engagement calculations
│   │   │   ├── distribution.ts  # Statistical distribution
│   │   │   ├── patterns.ts      # Posting pattern analysis
│   │   │   ├── titles.ts        # Title and SEO analysis
│   │   │   ├── summary.ts       # Executive summary generation
│   │   │   └── types.ts         # All YouTube/metric types
│   │   ├── redis.ts             # Upstash client (hot cache + rate limiting only)
│   │   ├── analytics.ts         # Typed PostHog wrapper (ADD)
│   │   ├── report.ts            # Report orchestration (fetch → compute → store)
│   │   ├── rate-limit.ts        # Per-IP rate limiting via Redis
│   │   └── utils.ts             # Shared utilities (formatNumber, etc.)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (Kintsugi-themed)
│   │   ├── charts/
│   │   │   ├── LineChart.tsx     # Themed Recharts line chart
│   │   │   ├── BarChart.tsx      # Themed Recharts bar chart
│   │   │   └── Heatmap.tsx       # Posting patterns heatmap
│   │   ├── report/
│   │   │   ├── ExecutiveSummary.tsx
│   │   │   ├── ChannelOverview.tsx
│   │   │   ├── MonthlyViewership.tsx
│   │   │   ├── EngagementDeepDive.tsx
│   │   │   ├── GrowthTrajectory.tsx
│   │   │   ├── ViewDistribution.tsx
│   │   │   ├── ProductionPatterns.tsx
│   │   │   ├── TitleSeoAnalysis.tsx
│   │   │   ├── ContentCategories.tsx
│   │   │   ├── ContentFreshness.tsx
│   │   │   ├── SubscriberEfficiency.tsx
│   │   │   ├── HeadToHeadVerdict.tsx
│   │   │   └── ReportSection.tsx  # Wrapper with loading/reveal animation
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── ActionBar.tsx     # Share + Download sticky bar
│   │   └── loading/
│   │       ├── LoadingScreen.tsx  # Facts/tips/progress
│   │       └── ProgressBar.tsx    # Gold gradient progress bar
│   ├── hooks/
│   │   ├── useComparison.ts     # SSE stream consumer
│   │   └── useTheme.ts          # Theme toggle logic
│   ├── styles/
│   │   ├── tokens.css           # Design tokens (both themes)
│   │   └── globals.css          # Global styles, font-face
│   └── __tests__/
│       ├── lib/                 # Unit tests for computation engine
│       ├── components/          # Component tests
│       ├── api/                 # API route tests
│       └── e2e/                 # Playwright E2E tests
├── public/
│   └── favicon.ico              # Kintsugi-themed favicon
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 18. Analytics Integration

Full details in [ADR-012](../adrs/012-analytics-driven-development.md).

### 18.1 Tools

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| PostHog | Product analytics: events, funnels, session replays, feature flags | 1M events/mo |
| Vercel Analytics | Web Vitals: LCP, CLS, FID, performance | Included with Vercel |

### 18.2 Key Events

| Event | Trigger | Properties |
|-------|---------|-----------|
| comparison_started | User clicks Compare | channels, channelCount |
| comparison_completed | Report fully rendered | reportId, durationMs, channelCount |
| comparison_failed | API error | error, channels |
| report_viewed | Report page loaded | reportId, source |
| report_section_visible | Section scrolls into viewport | reportId, section |
| report_shared | Share button clicked | reportId, method |
| shared_link_opened | Someone opens a shared link | reportId, referrer |
| report_expired_viewed | Expired page loaded | reportId, channels |
| report_regenerated | Re-generate clicked on expired page | reportId, channels |
| pdf_downloaded | PDF download button clicked | reportId, channelCount |
| loading_started | Comparison fetch begins | channelCount |
| loading_abandoned | User leaves during loading | durationMs, lastStage |
| loading_completed | All sections rendered | durationMs |
| signup_started | Auth flow initiated | source |
| signup_completed | User account created | method |
| report_saved | Logged-in user saves report | reportId |
| api_key_provided | User enters own API key | source |

### 18.3 Key Funnels

1. **Core**: landing → comparison_started → comparison_completed → report_shared
2. **Viral**: report_shared → shared_link_opened → comparison_started (new user)
3. **Conversion**: report_viewed → signup_started → signup_completed → report_saved
4. **Loading**: loading_started → loading_abandoned/completed (by stage)
5. **Expiry**: report_expired_viewed → report_regenerated

### 18.4 Dashboard Metrics (Weekly Review)

| Metric | Formula |
|--------|---------|
| Daily Active Comparisons | count(comparison_completed) / day |
| Viral Coefficient | shared_link_opened / comparison_completed |
| Loading Drop-off Rate | loading_abandoned / loading_started |
| Share Rate | report_shared / comparison_completed |
| Median Loading Time | p50(loading_completed.durationMs) |
| Report Scroll Depth | avg(report_scrolled.depthPercent) |
| Top Compared Channels | group by channels, count |
| Expiry Re-gen Rate | report_regenerated / report_expired_viewed |

---

*Specification complete. Ready for implementation planning.*
