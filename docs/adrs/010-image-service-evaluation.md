# ADR-010: Image Service Evaluation

**Status**: Accepted
**Date**: 2026-03-17
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku needs to handle several image-related concerns: social preview cards for shared reports, channel thumbnails, static assets, and chart rendering for PDF export.

## Image Use Cases in Hikaku

| Use Case | Size | Volume | Dynamic? |
|----------|------|--------|----------|
| OG social preview cards | 1200×630px | 1 per report | Yes — generated per report |
| Channel thumbnails/avatars | 88×88px | 2-4 per report | No — YouTube serves these |
| Favicon | 32×32, 180×180 | 1 (static) | No |
| Logo (比較) | SVG | 1 (static) | No |
| PDF report header | Embedded | 1 per download | No |
| Chart images for PDF | Variable | 5-12 per report | Yes — rendered from DOM |

## Key Observation

Most "images" in Hikaku aren't traditional images:
- Charts = Recharts in browser, captured by html2canvas for PDF
- OG cards = @vercel/og (JSX → image on Vercel edge)
- Channel thumbnails = YouTube serves directly from yt3.ggpht.com
- Logo/favicon = static assets in /public

## Options Evaluated

| Service | Free Tier | OG Generation | Image Optimization | Edge CDN | Lock-in |
|---------|-----------|---------------|-------------------|----------|---------|
| No service (built-in) | $0 | @vercel/og | next/image | Vercel CDN | None |
| ImageKit | 20GB/mo bandwidth | No | Yes (URL-based) | Global + India | Low |
| Cloudinary | 25GB/mo, 25K transforms | No | Yes | Global | Low |
| Cloudflare Images | 5K images free | No | Yes | Fastest | Medium |
| Bunny Optimizer | 500MB + 1TB bandwidth | No | Yes, 119 PoPs | Global | Low |
| Imgproxy | Free (self-hosted) | No | Yes | Self-managed | None |

## Decision

### V1: No external image service

Use built-in tools only:
- `@vercel/og` for OG social preview cards (free, runs on Vercel edge)
- `next/image` with `remotePatterns: ['yt3.ggpht.com']` for channel thumbnails (auto-optimizes, caches on Vercel CDN)
- `/public` directory for static assets (logo, favicon)
- `html2canvas` client-side for chart capture in PDF export

**Total cost: $0, zero additional services, zero additional accounts.**

### V2: Re-evaluate when needed

**Recommended for evaluation (not decided)**: ImageKit

Reasons to evaluate ImageKit first:
1. URL-based transforms — no upload step, point at any URL and transform on the fly
2. Built for India — HQ in Delhi, strong India PoPs
3. Generous free tier (20GB/mo)
4. No SDK required — URL construction: `https://ik.imagekit.io/hikaku/tr:w-88,h-88/{url}`
5. Works as proxy — cache YouTube thumbnails through their CDN without storing anything

Other contenders to evaluate at that time:
- Cloudinary (largest ecosystem, most transforms)
- Bunny Optimizer (cheapest at scale)
- Cloudflare Images (fastest network)
- Self-hosted Imgproxy (zero cost, full control)

### Triggers for V2 re-evaluation

| Trigger | Signal |
|---------|--------|
| High traffic on shared reports | Vercel OG image generation hitting limits |
| User-uploaded content | Profile pictures, custom branding on reports |
| Server-side PDF generation | Need to store/serve pre-generated PDFs at scale |
| YouTube thumbnail rate limiting | YouTube blocking direct hotlinks |
| next/image optimization limits | Vercel image optimization quota exceeded |

## Consequences

- V1 has zero image infrastructure cost and zero additional vendor dependencies
- Channel thumbnails are served directly from YouTube (slight risk of hotlink blocking at scale, unlikely for V1 traffic)
- OG images are generated on-demand per request (cached by Vercel CDN, but regenerated if cache misses)
- Image service decision deferred until real usage data informs the choice
