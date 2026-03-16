# ADR-001: Tech Stack — Next.js + Vercel

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku is a YouTube channel comparison platform that needs:
- Server-side rendering for shareable report URLs with OG meta tags
- API routes to proxy YouTube Data API v3 (hide API keys)
- Edge/serverless-friendly architecture for fast cold starts on shared links
- A mature ecosystem for future startup features (auth, payments, analytics)
- Strong AI-assisted development support (well-documented, widely trained on)

## Options Considered

### Option A: Next.js + Vercel
- **Pros**: Native SSR, built-in API routes, best-in-class edge/serverless on Vercel, largest startup ecosystem (NextAuth, Stripe, Vercel Analytics), one-click Upstash integration, strong AI tooling support
- **Cons**: React overhead (~45KB), opinionated routing

### Option B: SvelteKit + Vercel/Railway
- **Pros**: Smallest bundle (~8KB), clean reactivity model, built-in SSR
- **Cons**: Smaller ecosystem, fewer AI tools trained on Svelte patterns, learning curve for the team

### Option C: Astro + React Islands + Fly.io
- **Pros**: Zero JS by default, islands for interactivity, great for content-heavy pages
- **Cons**: Most complexity (island hydration model), more manual infra on Fly, cold start issues on free tier, smaller ecosystem

## Decision

**Next.js + Vercel** — not by default, but by evaluation.

## Rationale

1. **SSR is non-negotiable** — shareable report URLs need server rendering for OG meta tags (Twitter/LinkedIn previews). Next.js does this best with `generateMetadata` and streaming SSR.
2. **Upstash Redis integrates in one click** on Vercel — zero infra configuration.
3. **The team already works in Next.js daily** — no framework learning curve. Speed matters for a side project.
4. **Startup extensibility** — when auth (NextAuth), payments (Stripe), and analytics (Vercel Analytics) are needed, the ecosystem is unmatched.
5. **The app is interactive** — charts, comparisons, filters. Astro's island model adds complexity for minimal gain since most of the page IS interactive.
6. **AI-first development** — Next.js + shadcn has the strongest AI tooling support (MCP servers, documentation, training data).

## Future Consideration

Report view pages (`/r/[id]`) could be extracted to Astro as a V2 optimization if they become the highest-traffic surface. These pages are read-heavy, interact-light — ideal for Astro's zero-JS model. This would be a clean, isolated refactor since the data layer (Upstash Redis) is shared.

## Consequences

- Vercel lock-in for hosting (acceptable — can migrate to self-hosted Next.js if needed)
- React bundle overhead on every page (~45KB gzipped)
- Strong ecosystem access for future features
