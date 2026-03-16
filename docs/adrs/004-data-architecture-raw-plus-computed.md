# ADR-004: Data Architecture — Raw + Computed Storage

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku fetches video-level data from YouTube Data API v3 and computes comparison metrics. The question: should we store only the computed results, or also the raw per-video data?

## Options Considered

| Approach | Raw Stored? | AI Customization? | Redis Size |
|----------|------------|-------------------|------------|
| A: Compute & discard | No | ❌ | ~50KB/report |
| **B: Store raw + computed** | **Yes** | **✅** | **~500KB-2MB/report** |
| C: Store raw, compute on-demand | Yes | ✅ | ~300KB-1MB |

## Decision

**Option B: Store both raw video data AND computed metrics in Redis.**

## Rationale

1. **The fetch is the expensive part** — YouTube API quota + 5-15 second latency. Storage is cheap. Don't throw away expensive data.
2. **AI customization requires raw data** — future features like "Compare only last 6 months", "Exclude viral outliers", "Show just shorts performance" all need per-video records.
3. **AI-generated insights** — "Based on the data, Channel A should post more on Wednesdays" requires access to raw posting patterns, not pre-aggregated metrics.
4. **Report personalization** — users may want to customize which sections appear, filter by date range, or re-weight the verdict criteria. All need raw data.
5. **Phased reveal** — raw data enables progressive computation and streaming sections to the client as they're ready.

## What Raw Data Includes

Per video (fetched via YouTube Data API v3):
```typescript
{
  id: string
  title: string
  publishedAt: string
  views: number
  likes: number
  comments: number
  durationSec: number
  tags: string[]
}
```

Per channel:
```typescript
{
  id: string
  title: string
  handle: string
  subscriberCount: number
  totalViews: number
  videoCount: number
  joinedDate: string
}
```

## Computation Engine

The analysis scripts built during the initial WW vs FRA comparison are ported to server-side TypeScript modules:
- `youtube-channel-stats.mjs` → `lib/youtube/client.ts`
- `youtube-video-breakdown.mjs` → `lib/youtube/metrics.ts` (categories, duration, title patterns)
- `engagement-comparison.mjs` → `lib/youtube/metrics.ts` (engagement computation)
- `deep-inference.mjs` → `lib/youtube/metrics.ts` (distribution, posting patterns, SEO)

Same algorithms, same output. Proven against real data.

## Consequences

- Higher Redis storage per report (~500KB-2MB vs ~50KB)
- Upstash free tier supports ~130-500 concurrent reports (sufficient for early stage)
- Enables entire class of future features without re-fetching YouTube data
- Raw data expires with the report (24h TTL) — no long-term storage concerns
