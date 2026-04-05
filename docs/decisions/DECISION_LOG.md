# Hikaku — Decision Log

All architectural and product decisions with rationale. Each major decision has a full ADR in `docs/adrs/`.

## Quick Reference

| # | Decision | Choice | ADR | Date |
|---|----------|--------|-----|------|
| 1 | Project Name | Hikaku (比較) — "Comparison" in Japanese | — | 2026-03-16 |
| 2 | Tech Stack | Next.js App Router + Vercel | [ADR-001](../adrs/001-tech-stack-nextjs-vercel.md) | 2026-03-16 |
| 3 | Cache Layer | Upstash Redis (24h TTL report cache) | [ADR-002](../adrs/002-database-upstash-redis.md) | 2026-03-16 |
| 4 | Design System | Kintsugi Dark + Washi Gold V2 Light (Wabi-sabi) | [ADR-003](../adrs/003-design-system-kintsugi-wabi-sabi.md) | 2026-03-16 |
| 5 | Data Architecture | Raw + Computed storage in Redis | [ADR-004](../adrs/004-data-architecture-raw-plus-computed.md) | 2026-03-16 |
| 6 | API Key Strategy | Hybrid (fallback to ours, user can provide) | [ADR-005](../adrs/005-api-key-strategy-hybrid.md) | 2026-03-16 |
| 7 | Sharing Model | Cached URL (24h) + PDF download + re-gen CTA | [ADR-006](../adrs/006-sharing-and-expiry-model.md) | 2026-03-16 |
| 8 | Component Library | shadcn/ui with Kintsugi theme override | [ADR-007](../adrs/007-component-library-shadcn.md) | 2026-03-16 |
| 9 | Loading UX | Phased reveal + engaging loading screen with facts/tips | [ADR-008](../adrs/008-loading-and-ux-strategy.md) | 2026-03-16 |
| 10 | Responsive | Mobile-first, enhanced desktop | [ADR-009](../adrs/009-responsive-mobile-first.md) | 2026-03-16 |
| 11 | Typography | Zen Kaku Gothic New (body) + Crimson Pro (display/kanji) | [ADR-003](../adrs/003-design-system-kintsugi-wabi-sabi.md) | 2026-03-16 |
| 12 | Charts | Recharts (lightweight, React-native) | [ADR-001](../adrs/001-tech-stack-nextjs-vercel.md) | 2026-03-16 |
| 13 | PDF Export | Client-side (html2canvas + jsPDF) | — | 2026-03-16 |
| 14 | OG Images | Dynamic via @vercel/og | — | 2026-03-16 |
| 15 | Analytics | Vercel Analytics (free tier) | — | 2026-03-16 |
| 16 | Rate Limiting | Per-IP on API routes | — | 2026-03-16 |
| 17 | Max Channels | 2-4 (configurable) | — | 2026-03-16 |
| 18 | Dev Approach | AI-first, TDD, full documentation | — | 2026-03-16 |
| 19 | Image Service | V1: None (use @vercel/og + next/image). V2: Evaluate ImageKit (recommended, not decided) | [ADR-010](../adrs/010-image-service-evaluation.md) | 2026-03-17 |
| 20 | Persistent Backend | Convex (AI-first: fewer files per feature, end-to-end TypeScript, auto-typed) | [ADR-011](../adrs/011-backend-convex-ai-first.md) | 2026-03-17 |
| 21 | Analytics | PostHog (product) + Vercel Analytics (web vitals). ADD approach: every feature ships with instrumentation | [ADR-012](../adrs/012-analytics-driven-development.md) | 2026-03-17 |
| 22 | Shareable Link Expiry | 6 hours (not 24h — shorter is enough for social sharing cycle) | [ADR-006](../adrs/006-sharing-and-expiry-model.md) | 2026-03-17 |
| 23 | Anonymous Data Lifecycle | Raw data purged at 72h. Only metadata (channels, timestamp) kept permanently for analytics | [ADR-011](../adrs/011-backend-convex-ai-first.md) | 2026-03-17 |
| 24 | Data Split | Convex = source of truth (raw + computed + permanent). Redis = hot cache + ephemeral only | [ADR-002](../adrs/002-database-upstash-redis.md), [ADR-011](../adrs/011-backend-convex-ai-first.md) | 2026-03-17 |
| 25 | Server State | Convex hooks (useQuery/useMutation). No TanStack Query — redundant with Convex | [ADR-013](../adrs/013-frontend-state-and-forms.md) | 2026-03-17 |
| 26 | Forms | React Hook Form + Zod (shared client+server validation) | [ADR-013](../adrs/013-frontend-state-and-forms.md) | 2026-03-17 |
| 27 | Client State | None — component-local + next-themes. No Zustand/Redux (YAGNI) | [ADR-013](../adrs/013-frontend-state-and-forms.md) | 2026-03-17 |
| 28 | API Middleware | Composable utilities (withValidation, withRateLimit). No framework | [ADR-013](../adrs/013-frontend-state-and-forms.md) | 2026-03-17 |
| 29 | Raw Data Shape | Fat — store full YouTube API response, not just projected fields. Enables future analysis (FS-1–FS-6). Supersedes ADR-004 field lists. | [ADR-014](../adrs/014-fat-raw-data-storage.md) | 2026-04-05 |
| 30 | Channel Resolution | forHandle on Channels endpoint (1 quota unit) instead of Search API (100 units). 10x daily capacity. Supersedes ADR-005 quota numbers. | [ADR-015](../adrs/015-channel-resolution-forhandle.md) | 2026-04-05 |

## Rejected Alternatives

| What | Rejected Option | Why | Chosen Instead |
|------|----------------|-----|---------------|
| Framework | SvelteKit | Smaller ecosystem, learning curve, fewer AI tools | Next.js |
| Framework | Astro + Islands | Island hydration complexity for interactive app | Next.js (Astro as future V2 for /r/ pages) |
| Hosting | Fly.io | Cold starts, manual Redis setup, Docker config | Vercel |
| Hosting | Railway | More friction without meaningful benefit | Vercel |
| Persistent Backend | Supabase | More boilerplate per feature (5-7 files vs 3), SQL↔TypeScript translation layers hurt AI velocity | Convex |
| Persistent Backend | Convex (rejected then accepted) | Initially rejected for lock-in; accepted after AI-first analysis showed 2-3x fewer files per feature | Convex |
| Cache | Supabase | No native TTL, overkill for ephemeral cache | Upstash Redis |
| Cache | Turso | No native TTL, manual cleanup needed | Upstash Redis |
| Image Service (V1) | Cloudinary | Not needed — @vercel/og + next/image covers all V1 use cases at $0 | No service |
| Image Service (V1) | ImageKit | Not needed for V1, recommended for V2 evaluation | Deferred |
| Components | Tailwind + Radix (no shadcn) | Loses AI ecosystem advantage | shadcn/ui |
| Dark Theme | Stone Garden | Too stark for data-heavy pages | Kintsugi |
| Light Theme | Paper & Ink | No shared DNA with Kintsugi dark (brown ≠ gold) | Washi Gold V2 |
| Light Theme | Washi Gold V1 | Contrast too low (3.8:1, fails WCAG AA) | Washi Gold V2 (5.8:1) |
| Light Theme | Sunlit Clay | Less clean, too warm for tech product | Washi Gold V2 |
| Typography | Crimson Pro + Inter | Safe but generic, no Japanese character | Zen Kaku Gothic + Crimson Pro |
| Typography | Source Serif 4 | Numbers less crisp in data tables | Zen Kaku Gothic + Crimson Pro |
| Typography | DM Serif Display + Sora | Less wabi-sabi, too "startup-y" | Zen Kaku Gothic + Crimson Pro |
| Data Storage | Compute & discard | No AI customization possible | Raw + Computed |

## Origin Context

This project originated from a YouTube channel comparison analysis performed for Grip Invest, comparing Wint Wealth (@WintWealthYT) vs Fixed Returns Academy (@FixedReturnsAcademy). The analysis scripts and methodology were prototyped in the gi-client-web repository before being productized as Hikaku.
