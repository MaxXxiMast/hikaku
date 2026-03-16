# Hikaku — Decision Log

All architectural and product decisions with rationale. Each major decision has a full ADR in `docs/adrs/`.

## Quick Reference

| # | Decision | Choice | ADR | Date |
|---|----------|--------|-----|------|
| 1 | Project Name | Hikaku (比較) — "Comparison" in Japanese | — | 2026-03-16 |
| 2 | Tech Stack | Next.js App Router + Vercel | [ADR-001](../adrs/001-tech-stack-nextjs-vercel.md) | 2026-03-16 |
| 3 | Database | Upstash Redis (24h TTL) | [ADR-002](../adrs/002-database-upstash-redis.md) | 2026-03-16 |
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

## Rejected Alternatives

| What | Rejected Option | Why | Chosen Instead |
|------|----------------|-----|---------------|
| Framework | SvelteKit | Smaller ecosystem, learning curve, fewer AI tools | Next.js |
| Framework | Astro + Islands | Island hydration complexity for interactive app | Next.js (Astro as future V2 for /r/ pages) |
| Hosting | Fly.io | Cold starts, manual Redis setup, Docker config | Vercel |
| Hosting | Railway | More friction without meaningful benefit | Vercel |
| Database | Supabase | Overkill for key-value, no native TTL | Upstash Redis |
| Database | Turso | No native TTL, manual cleanup needed | Upstash Redis |
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
