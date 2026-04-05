# ADR-015: Channel Resolution via forHandle

**Status**: Accepted
**Date**: 2026-04-05
**Deciders**: Purujit Negi, Claude (AI pair)
**Supersedes**: ADR-005's quota budget numbers (lines 24-27). ADR-005's hybrid key strategy remains valid.

## Context

The reference scripts (Phase 0 discovery) use the YouTube Search API to resolve `@handle` to `channelId`. This costs 100 quota units per call. A 4-channel comparison spends 400 units just on resolution — 40% of a daily free-tier budget (10,000 units).

In January 2024, YouTube added the `forHandle` parameter to the Channels endpoint (`channels.list`). This resolves a handle directly at 1 quota unit per call — the same endpoint that fetches channel statistics and content details.

## Options Considered

| Approach | Resolution Cost | Total Calls | Notes |
|----------|----------------|-------------|-------|
| A: Search API (current) | 100 units/channel | 2 per channel (search + channels) | Fuzzy match, proven in scripts |
| **B: forHandle on Channels** | **1 unit/channel** | **1 per channel** | **Exact match, single call** |
| C: forUsername (legacy) | 1 unit/channel | 1 per channel | Deprecated, doesn't support @ handles |

## Decision

**Option B: Use `channels?forHandle=@handle&part=snippet,statistics,contentDetails`** — resolves handle and fetches full channel data in a single 1-unit API call.

## Rationale

1. **100x cheaper** — 1 unit vs 100 units per channel resolution
2. **Single call** — Search API requires search + channels (2 calls). forHandle does both in one.
3. **Exact match** — Search API returns fuzzy results. forHandle is an exact handle lookup.
4. **Official and stable** — Added Jan 2024, documented in YouTube Data API revision history, not deprecated.
5. **Simple fallback** — if forHandle is ever removed, reverting to Search API is a one-function change in `client.ts`.

## Quota Impact

| Scenario | Old (Search) | New (forHandle) | Savings |
|----------|-------------|-----------------|---------|
| 2-channel comparison | ~222 units | ~22 units | 90% |
| 4-channel comparison | ~444 units | ~44 units | 90% |
| Daily capacity (10K units) | ~22 comparisons | ~227 comparisons | 10x |

*Video fetching costs unchanged — pagination and batching remain the same.*

Note: these estimates assume default 4-month time window (brainstorm decision #16). Full-history comparisons on channels with thousands of videos will use more units for pagination.

## Implementation

```typescript
// Single call: resolve handle + get full channel data
const data = await ytFetch("channels", {
  part: "snippet,statistics,contentDetails",
  forHandle: handle, // e.g., "@WintWealthYT"
}, apiKey)
```

- `resolveChannel(handle, apiKey)` calls Channels endpoint with `forHandle`
- Returns normalized `RawChannel` with all fields
- Throws `"Channel not found: @handle"` if `items` array is empty (atomic fail per brainstorm decision #10)

## Consequences

- 10x more daily comparisons on free tier
- Simpler client code (one call instead of two)
- Rate limiting strategy can be more generous (per ADR-005, but with updated numbers)
- Risk: YouTube could deprecate `forHandle` — low probability given it's 2+ years old and actively documented

## Sources

- [Channels: list | YouTube Data API](https://developers.google.com/youtube/v3/docs/channels/list) — forHandle parameter documentation
- [Revision History | YouTube Data API](https://developers.google.com/youtube/v3/revision_history) — added January 31, 2024
