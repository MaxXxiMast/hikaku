# ADR-014: Fat Raw Data Storage

**Status**: Accepted
**Date**: 2026-04-05
**Deciders**: Purujit Negi, Claude (AI pair)
**Supersedes**: ADR-004's "What Raw Data Includes" field lists (lines 34-62). ADR-004's core decision (store raw + computed) remains valid.

## Context

ADR-004 decided to store raw + computed data. It defined slim interfaces: `RawVideo` with 8 fields (id, title, publishedAt, views, likes, comments, durationSec, tags) and `RawChannel` with 8 fields (id, title, handle, subscriberCount, totalViews, videoCount, joinedDate, uploadsPlaylistId).

During Plan 2 brainstorming, we identified that the YouTube Data API v3 returns substantially more data per video and channel at zero additional quota cost (same `part` parameters). Storing only 8 fields discards data that enables future analysis — description content, YouTube's own category IDs, topic classifications, thumbnail URLs, caption availability, channel country, and branding settings.

The question: should we store only the projected fields we need for V1 computation, or the full API response?

## Options Considered

| Approach | Fields/Video | Storage/Report | Future Capability |
|----------|-------------|----------------|-------------------|
| A: Slim (current) | 8 | ~500KB-2MB | Limited to V1 metrics only |
| **B: Fat (full API response)** | **~20** | **~1-5MB** | **Enables FS-1 through FS-6** |
| C: Slim + raw blob | 8 normalized + raw JSON blob | ~2-5MB | Full capability but dual-read |

## Decision

**Option B: Fat storage** — store all fields the YouTube API returns, normalized into expanded TypeScript interfaces. Zod schemas at the API boundary validate and normalize the response shape.

## Rationale

1. **Zero additional API cost** — the data is already in the response. We're just not throwing it away.
2. **72h purge limits storage cost** — anonymous/unsaved reports are temporary. Fat storage within the purge window is negligible.
3. **Enables future analysis** — description SEO, YouTube category analysis, topic clustering, thumbnail patterns, language detection, caption availability (FS-1 through FS-6 from brainstorm).
4. **Computation modules stay slim** — modules consume normalized interfaces with only the fields they need. Fat storage is at the persistence layer, not the computation layer.
5. **Re-fetching is expensive** — if a future feature needs `description` or `categoryId`, we'd have to re-call the YouTube API and burn quota. Better to store it now.

## Implementation

- `YouTubeVideoResponseSchema` and `YouTubeChannelResponseSchema` — Zod schemas matching full API response shape
- `RawVideo` and `RawChannel` — expanded normalized interfaces (8 → ~20 fields each)
- `client.ts` — validates API responses through Zod at the boundary, normalizes into our interfaces
- Convex schema already uses `v.any()` for raw data, so no schema migration needed
- Computation modules import only the types they need (no change to module interfaces)

### Additional Video Fields

- `description` — content strategy analysis, CTA patterns, link placement
- `categoryId` — YouTube's own categorization (complements our keyword classifier)
- `thumbnailUrl` — future thumbnail pattern analysis
- `topicCategories` — Wikipedia-based topic classification
- `definition` — HD vs SD content quality signal
- `caption` — subtitle availability (accessibility signal)
- `defaultLanguage` — multi-language content analysis
- `channelId` — linking back to channel

### Additional Channel Fields

- `description` — channel positioning, brand analysis
- `country` — geographic targeting context
- `thumbnailUrl` — channel avatar for UI
- `bannerUrl` — channel branding
- `keywords` — channel-level SEO strategy (from brandingSettings)
- `topicCategories` — channel topic classification

## Consequences

- Storage per report increases ~2-3x (within Convex limits, mitigated by 72h purge)
- Zod validation adds ~50 lines to types.ts — small, one-time cost
- Every future analysis feature has data available without re-fetching
- No computation module changes — they continue consuming the same normalized fields
