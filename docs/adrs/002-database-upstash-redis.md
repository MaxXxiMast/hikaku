# ADR-002: Cache Layer — Upstash Redis

**Status**: Superseded for data storage (updated 2026-03-17). Redis is now CACHE ONLY.
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)
**Superseded by**: [ADR-011](011-backend-convex-ai-first.md) — Convex is now the source of truth for all report data.

> **WARNING**: This ADR's original data structure and TTL sections are outdated. Redis no longer stores raw data or full reports. See ADR-011 for current architecture. Redis role is limited to:
> - Hot cache for computed metrics: key `report:{id}:computed`, TTL 4 hours
> - Rate limiting: key `ratelimit:{ip}`, TTL 1 hour
> - In-progress comparison state: ephemeral, minutes TTL

## Context

Hikaku needs to store comparison reports for sharing via URL. Requirements:
- Reports expire after 24 hours (auto-cleanup, no cron jobs)
- Shareable URLs that render server-side with full OG meta tags
- Store both raw video data AND computed metrics (enables future AI customization)
- Free tier sufficient for early traction
- Minimal infrastructure complexity

## Options Considered

| Option | Free Tier | TTL Support | Complexity | Notes |
|--------|-----------|-------------|------------|-------|
| **Upstash Redis** | 10K req/day, 256MB | Native `EX 86400` | Low | Vercel one-click integration |
| Vercel KV | 3K req/day, 256MB | Native TTL | Low | Lower free tier quota |
| Supabase (Postgres) | 500MB, unlimited API | Needs cron/trigger | Medium | Overkill for key-value |
| Turso (SQLite edge) | 9GB, 500M reads | Manual cleanup | Medium | Good but no native TTL |
| Cloudflare KV | 100K reads/day | Native TTL | Low | Different platform |

## Decision

**Upstash Redis**

## Rationale

1. **Native TTL** — `SET report:abc123 data EX 86400` auto-deletes after 24 hours. Zero cleanup code, zero cron jobs, zero maintenance.
2. **Free tier is generous** — 10,000 requests/day handles early traction. Compare: Vercel KV is only 3,000.
3. **First-class Vercel integration** — one-click setup, environment variables auto-configured.
4. **Pay-as-you-grow** — if Hikaku becomes a startup, scales without migration. $0.2/100K commands.
5. **Edge-compatible** — works with Vercel Edge Functions for fast global response.
6. **REST SDK** — works from serverless functions without persistent connections.

## Data Structure

```
report:{nanoid} → {
  meta: { generatedAt, expiresAt, channelHandles },
  raw: {
    channels: [{ id, title, subs, totalViews, ... }],
    videos: [{ id, title, views, likes, comments, duration, tags, publishedAt, ... }]
  },
  computed: {
    overview, engagement, growth, distribution,
    postingPatterns, titleAnalysis, categories, verdict, ...
  }
}
TTL: 86400 seconds (24 hours)
```

## Storage Estimates

| Channels | Avg Videos | Raw Size | Computed Size | Total |
|----------|-----------|----------|---------------|-------|
| 2 | 200 | ~400KB | ~50KB | ~450KB |
| 4 | 400 | ~800KB | ~100KB | ~900KB |

At 256MB free tier: ~280 concurrent reports (2-channel) or ~140 (4-channel). Sufficient for early stage.

## Why Store Raw Data?

Raw per-video data enables future AI customization features:
- "Compare only their last 6 months"
- "What if we exclude viral outliers?"
- "Show me just their shorts performance"
- AI-generated insights ("Based on the data, Channel A should post more on Wednesdays")

Without raw data, these would require re-fetching from YouTube API (quota cost + latency).

## Consequences

- 24-hour report expiry — intentional. Creates urgency for sharing, keeps storage low.
- Expired reports preserve channel handles in URL params for re-generation.
- Re-generation CTA on expired reports is a future paywall opportunity.
- Upstash vendor lock-in (minimal — standard Redis protocol, easy to migrate).
