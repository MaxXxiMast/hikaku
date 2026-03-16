# ADR-006: Report Sharing & Expiry Model

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Shareable report URLs are Hikaku's primary growth mechanism. Every shared link is a free marketing touchpoint. The model needs to balance virality, storage costs, and future monetization.

## Decision

### Sharing
- Every comparison generates a shareable URL: `hikaku.app/r/{nanoid}`
- Reports are publicly accessible (no auth wall)
- Dynamic OG images via `@vercel/og` for rich social previews on Twitter/LinkedIn/WhatsApp
- PDF download button for permanent offline copies

### Expiry
- Reports cached in Upstash Redis with 24-hour TTL
- After expiry, the URL redirects to an expired page
- Channel handles preserved in URL params: `/r/{id}?ch=@channelA,@channelB`

### Expired Report Page
- Shows which channels were compared (from URL params, not Redis)
- **"Re-generate this comparison"** CTA button
- This CTA is a future paywall opportunity — free users can generate new reports, but re-generating an expired one could be a paid feature

## Growth Mechanics

```
User creates comparison
  → Shares link on Twitter/LinkedIn/WhatsApp
    → Recipient views report (rich OG preview attracts clicks)
      → Report expires after 24h
        → Expired page shows "Re-generate" CTA
          → New user creates their own comparison
            → Cycle repeats
```

The 24-hour expiry creates urgency ("check this before it expires") while every expired link becomes a conversion opportunity rather than a dead end.

## Inspiration

- **Loom**: Free viewing, monetize creation
- **Carbon**: Shareable screenshots as growth engine
- **Excalidraw**: Shareable links with expiry

## Consequences

- Every shared link markets the product
- 24h window is sufficient for social media virality cycle
- Zero long-term storage burden
- Natural freemium gate for future monetization
- PDF download satisfies users who want permanent copies
