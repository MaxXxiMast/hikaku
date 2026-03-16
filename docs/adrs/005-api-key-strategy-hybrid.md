# ADR-005: YouTube API Key Strategy — Hybrid

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku needs a YouTube Data API v3 key to fetch channel and video data. The key must be protected (server-side only) while providing a good user experience.

## Decision

**Hybrid approach**: Server uses a default API key. Users can optionally provide their own key if the default is exhausted or restricted.

## Implementation

1. **Default key** stored in `YOUTUBE_API_KEY` environment variable on Vercel (never exposed to client)
2. **User-provided key** accepted via an optional input field on the landing page
3. **UI messaging**: "Provide your own YouTube API key if the default one isn't working" — no mention of "our key" or "fallback"
4. **Server-side proxy**: All YouTube API calls go through Next.js API routes. The key (default or user-provided) never reaches the browser.

## Rate Limiting

- Per-IP rate limiting on `/api/compare` to prevent quota abuse
- YouTube API free tier: 10,000 quota units/day
- Full 4-channel comparison uses ~500 units
- Default key supports ~20 full comparisons/day

## Future Consideration

When traffic exceeds free tier:
- Implement API key rotation (multiple keys)
- Or require user-provided keys for all requests (shifts quota cost to users)
- Or introduce usage-based pricing

## Consequences

- Frictionless first experience (no API key setup required)
- Protected from quota abuse via rate limiting
- Graceful degradation when default key is exhausted
- Users who need heavy usage can self-serve with their own key
