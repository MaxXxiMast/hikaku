# ADR-008: Loading Experience & UX Strategy

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

YouTube API fetches for 2-4 channels with 100-400+ videos take 5-20 seconds. This is a significant wait that risks user drop-off.

## Decision

### Phased Reveal + Engaging Loading Screen

Two complementary strategies:

**1. Loading Screen with Content**
During the initial fetch, show a progress bar with rotating content:
- YouTube facts ("YouTube has over 800 million videos")
- Channel tips ("Channels with question-based titles get 22% more views")
- Hikaku hints ("You can compare up to 4 channels at once")
- Live progress updates ("Fetching video data... Computing engagement rates...")
- Wabi-sabi quotes ("In the beginner's mind there are many possibilities")

**2. Phased Section Reveal**
As data becomes available, sections slide in progressively. See the design spec Section 4.2 for the canonical 9-stage timeline (~0s through ~16s). The stages are driven by the computation pipeline:
```
[0s]   Loading screen with facts
[~2s]  Channel Overview cards appear (channels resolved)
[~4s]  Executive Summary appears
[~6s]  MoM Viewership chart appears
[~8s]  Engagement section appears
[~10s] Growth + Distribution appear
[~12s] Posting Patterns + Title/SEO appear
[~14s] Content Categories + Subscriber Efficiency appear
[~16s] Freshness + Verdict appear → Share/Download bar slides up
```

## Inspiration

- **Notion AI**: Shows "thinking" state with status updates
- **Perplexity**: Progressive answer rendering
- **Linear**: Smooth loading transitions with context

## Rationale

- Users tolerate longer waits when informed/entertained
- Each section "arriving" creates small dopamine hits
- Progress visibility reduces perceived wait time
- Content during loading educates users about the product and YouTube analytics

## Consequences

- Requires streaming/SSE from API routes to client
- Section components must handle independent loading states
- Loading content needs to be curated and maintained
- More complex than a simple spinner, but dramatically better UX
