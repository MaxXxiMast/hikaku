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
As data becomes available, sections slide in progressively:
```
[0s]   Start → Loading screen with facts/tips
[2s]   Channels resolved → Channel overview cards appear
[4s]   Videos fetched → Video count shown, computation starts
[6s]   Engagement computed → Engagement section slides in
[8s]   Categories computed → Content breakdown appears
[10s]  Patterns computed → Posting patterns appear
[12s]  All complete → Remaining sections + share/download buttons
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
