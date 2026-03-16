# Hikaku (比較) — Project Instructions

## What Is This

Hikaku is a YouTube channel comparison platform that lets users compare up to 4 YouTube channels side-by-side with deep analytics. Built with a Wabi-sabi (侘寂) Japanese aesthetic — finding beauty in imperfection, transience, and simplicity.

**Live**: hikaku.app (Vercel)
**Repo**: github.com/MaxXxiMast/hikaku
**Owner**: Purujit Negi (@MaxXxiMast)

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router, React 19) | SSR, routing, API routes |
| Styling | Tailwind CSS v4 + shadcn/ui (Kintsugi-themed) | Design system, components |
| Charts | Recharts | Data visualization |
| Persistent Backend | Convex | Users, auth, reports, AI personalization, vector search |
| Cache | Upstash Redis | Hot cache (4h TTL), rate limiting, ephemeral state |
| Hosting | Vercel | Edge hosting, serverless |
| Forms | React Hook Form + Zod | Form state, client+server validation |
| Server State | Convex hooks (useQuery, useMutation) | No TanStack Query — Convex handles caching/reactivity |
| Client State | None (component-local + next-themes) | No Zustand/Redux — zero global state in V1 |
| Theme | next-themes | Dark/light toggle, shadcn standard |
| Fonts | Zen Kaku Gothic New (body) + Crimson Pro (display/kanji) | Typography |
| PDF | html2canvas + jsPDF (client-side) | Report export |
| OG Images | @vercel/og + next/image | Dynamic social previews, thumbnail optimization |
| Product Analytics | PostHog | Events, funnels, session replays |
| Web Vitals | Vercel Analytics | Performance monitoring |

## Design System — Kintsugi (金継ぎ)

The design follows Wabi-sabi principles: generous negative space, muted earth tones, thin typography, no gradients, no drop shadows.

### Theme Tokens

**Kintsugi Dark (default):**
- `--background`: #121210
- `--surface`: #1a1a18
- `--accent-gold`: #c5a55a
- `--accent-sage`: #8a9a7a
- `--text-primary`: #d4cfc5
- `--text-muted`: #7a756c
- `--border`: rgba(197,165,90,0.12)

**Washi Gold V2 Light:**
- `--background`: #f5f1ea
- `--surface`: #fdfcf8
- `--accent-gold`: #856b1e
- `--accent-sage`: #4d6a3a
- `--text-primary`: #1e1b16
- `--text-muted`: #918c82
- `--border`: rgba(133,107,30,0.15)

### Typography Rules

- **Crimson Pro**: ONLY for the kanji logotype (比較) and section headings
- **Zen Kaku Gothic New**: Everything else — UI, data, tables, labels, body text
- Never use system fonts or fallback to sans-serif for visible text
- Number weights: 400 (regular) for data, 500 for emphasis, 200-300 for display headings
- Letter spacing: 0.1-0.15em for kanji, 0.25-0.3em for uppercase labels

### Design Rules (MUST FOLLOW)

- **Never hardcode color values** — always use CSS variables / Tailwind theme tokens
- **Never use box-shadow** — wabi-sabi avoids artificial depth. Use borders at 12-15% opacity instead
- **Never use gradients** for backgrounds — solid colors only. Gradients allowed ONLY for gold divider lines
- **No border-radius > 8px** — subtle rounding only, not pill shapes
- **Generous padding** — minimum 1rem on cards, 2rem on sections. Data should breathe
- **Gold (#c5a55a / #856b1e) is for emphasis only** — key metrics, accents, interactive elements. Not for large surfaces
- **Each channel gets a distinct color** — Channel A = gold, Channel B = sage, Channel C/D = assigned from palette
- **Subtle animations only** — fade-in, slide-up for phased reveal. No bounce, no spring, no scale transforms

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing — channel input
│   ├── compare/page.tsx    # Live comparison (SSR)
│   ├── r/[id]/page.tsx     # Cached report (SSR + OG)
│   ├── r/[id]/expired/     # Expired report + re-gen CTA
│   └── api/                # Server-side API routes
│       ├── compare/        # YouTube API proxy + compute
│       └── report/         # Create/fetch cached reports
├── convex/                 # Convex backend (persistent layer)
│   ├── schema.ts           # Data schema (TypeScript)
│   ├── reports.ts          # Report mutations/queries
│   ├── users.ts            # User queries
│   ├── history.ts          # Search history
│   └── crons.ts            # Scheduled jobs (72h purge, 6h link expiry)
├── lib/
│   ├── youtube/            # YouTube API client + metrics engine
│   ├── redis.ts            # Upstash client (hot cache + rate limiting)
│   ├── analytics.ts        # Typed PostHog wrapper (ADD)
│   └── report.ts           # Report orchestration logic
├── components/
│   ├── ui/                 # shadcn/ui components (Kintsugi-themed)
│   ├── charts/             # Recharts wrappers
│   ├── report/             # Report section components
│   └── layout/             # Header, footer, theme toggle
└── styles/
    ├── tokens.css          # Design tokens (both themes)
    └── globals.css         # Global styles
```

## Data Flow

```
User enters 2-4 @handles → POST /api/compare
→ Server fetches YouTube Data API v3 (channels → playlists → videos)
→ Computes all metrics (engagement, categories, distribution, patterns)
→ Stores raw + computed in Convex (source of truth)
→ Caches computed metrics in Redis (hot cache, 4h TTL)
→ If logged in: saves to user's search history in Convex
→ Returns { reportId, data }
→ Client renders with phased section reveal
→ Share button → hikaku.app/r/{reportId}
→ After 6h → shareable link expires (Convex scheduled job flips public flag)
→ Expired page with re-generate CTA
```

### Data Lifecycle

```
Anonymous user:
  Raw + computed → Convex (temporary, 72h purge via scheduled job)
  Metadata only → Convex (permanent, for analytics: channels, timestamp)
  Hot cache → Redis (4h TTL)

Logged-in user (unsaved report):
  Same as anonymous — 72h purge

Logged-in user (saved report):
  Raw + computed → Convex (permanent, enables AI re-analysis)
  Hot cache → Redis (4h TTL)
```

### Data Layer Split

```
Convex (source of truth)            Redis (hot cache + ephemeral)
├── Report raw data                  ├── Hot computed metrics (4h TTL)
├── Report computed metrics          ├── Rate limit counters (minutes)
├── Report metadata (permanent)      ├── In-progress comparison state
├── User accounts (Clerk auth)       └── Session tokens
├── Search history
├── Saved report references
├── AI personalization prefs
├── Custom report configs
├── Vector embeddings
└── Usage analytics
```

## Report Sections (in order)

1. Executive Summary (auto-generated TL;DR)
2. Channel Overview (side-by-side cards)
3. Month-on-Month Viewership (line/bar chart)
4. Engagement Deep Dive (rates, monthly trend, duration breakdown)
5. Growth Trajectory (lifecycle phases, MoM comparison)
6. View Distribution & Virality (percentiles, Gini, viral thresholds)
7. Production Patterns (upload frequency, best day/hour heatmap)
8. Title & SEO Analysis (patterns, tag analysis)
9. Content Category Breakdown (category performance table)
10. Subscriber Efficiency (views/sub, views/sub/video)
11. Content Freshness (last 30d vs all time)
12. Head-to-Head Verdict (multi-dimension scorecard)

## Development Approach

### AI-First

This project is designed for AI-assisted development:
- CLAUDE.md provides full context for every session
- ADRs document every architectural decision with rationale
- Components are self-documenting with clear interfaces
- shadcn/ui chosen specifically for AI ecosystem compatibility

### TDD (Test-Driven Development)

All features follow Red → Green → Refactor:
1. Write failing test first
2. Write minimum code to pass
3. Refactor while keeping tests green

### ADD (Analytics-Driven Development)

Analytics is a core discipline, not an afterthought. Every feature ships with instrumentation:
1. Define the metric before building the feature
2. Instrument events alongside the code
3. Verify data flows after shipping
4. Every PR includes: Code + Tests (TDD) + Analytics events (ADD)

**Tools**: PostHog (product analytics, 1M events/mo free) + Vercel Analytics (Web Vitals)
**Event schema**: Typed in `lib/analytics.ts` — never call posthog.capture directly
**Naming**: `{noun}_{verb_past_tense}` (e.g., `report_shared`, `comparison_completed`)

### Documentation

- **ADRs**: `docs/adrs/` — every architectural decision
- **Decision Log**: `docs/decisions/DECISION_LOG.md` — quick reference
- **Brainstorm Notes**: `docs/brainstorm/` — session captures
- **Design Spec**: `docs/specs/` — full product specification

## Coding Conventions

### File Naming
- Components: PascalCase (`ChannelCard.tsx`)
- Utilities: camelCase (`formatNumber.ts`)
- Types: PascalCase files, PascalCase exports (`types/Report.ts`)
- Tests: co-located (`ChannelCard.test.tsx`)
- CSS modules: camelCase (`channelCard.module.css`) — only if needed beyond Tailwind

### Imports
- Absolute imports via `@/` alias (maps to `src/`)
- Group: React/Next → external libs → internal modules → types → styles

### TypeScript
- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- All API responses typed
- No `any` — use `unknown` and narrow

### Components
- Server Components by default
- `'use client'` only when needed (interactivity, hooks, browser APIs)
- Props interfaces exported alongside component
- Composition over inheritance

### Git Conventions
- Branch: `feature/`, `fix/`, `docs/`, `refactor/`
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- PR template with testing evidence

## API Key Management

- Default YouTube API key in `YOUTUBE_API_KEY` env var (server-side only)
- User can optionally provide their own key
- UI message: "Provide your own YouTube API key if the default isn't working"
- NEVER expose any API key to the client/browser
- Rate limit: per-IP on `/api/compare`

## What NOT To Do

- Don't use colors outside the Kintsugi/Washi Gold token system
- Don't add authentication for V1 (no auth wall on reports)
- Don't add payment/billing for V1
- Don't store data beyond 24h TTL (no permanent storage)
- Don't add features beyond the defined report sections without discussion
- Don't use `console.log` for debugging — use structured logging if needed
- Don't skip tests — TDD is mandatory, not optional
- Don't create components without first checking if shadcn/ui has a primitive
- Don't fight shadcn defaults by overriding individual components — modify the theme tokens instead
