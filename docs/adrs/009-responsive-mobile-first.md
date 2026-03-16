# ADR-009: Responsive Strategy — Mobile-First

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Shared report links will primarily be opened on mobile devices (WhatsApp, Twitter, LinkedIn shares). The platform must provide an excellent mobile experience while maintaining a rich desktop layout.

## Decision

**Mobile-first responsive design.** Build for mobile, enhance for desktop. Not the other way around.

## Rationale

1. **Shared links open on phones** — the primary distribution channel (social media, messaging apps) is mobile-dominated
2. **Tailwind is mobile-first by default** — unprefixed utilities target mobile, `md:` and `lg:` enhance for larger screens
3. **Data tables are the hardest part** — comparison tables with 2-4 channels need careful mobile treatment (horizontal scroll, stacked cards, or progressive disclosure)
4. **Charts adapt well** — Recharts is responsive by default with `<ResponsiveContainer>`

## Layout Strategy

| Breakpoint | Columns | Chart Size | Table Treatment |
|-----------|---------|------------|-----------------|
| Mobile (<640px) | 1 column, stacked | Full width | Stacked cards or horizontal scroll |
| Tablet (640-1024px) | 2 columns | Half width | Side-by-side with scroll |
| Desktop (>1024px) | 2-4 columns (channel count) | Flexible | Full comparison table |

## Consequences

- Mobile experience is first-class, not an afterthought
- Desktop gets enhanced layouts, not just stretched mobile
- Data-heavy tables require creative mobile solutions
- OG images and social previews must look good at mobile thumbnail sizes
