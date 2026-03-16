# ADR-013: Frontend State Management, Forms & Data Fetching

**Status**: Accepted
**Date**: 2026-03-17
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku needs decisions on: server state management, form handling, validation, client state, and API middleware patterns.

## Decisions

### Server State: Convex Hooks (no TanStack Query)

Convex's `useQuery` and `useMutation` provide reactive, auto-typed, cached data fetching. TanStack Query would be a redundant second caching layer.

**Exception**: The YouTube API comparison fetch (SSE stream from `/api/compare`) uses a custom `useComparison` hook with native EventSource — this is the only non-Convex server interaction.

### Forms: React Hook Form + Zod

Hikaku has one significant form (channel comparison: 2-4 dynamic inputs + optional API key).

- React Hook Form: uncontrolled inputs (no re-renders), `useFieldArray` for dynamic channels, first-class shadcn/ui integration
- Zod: shared validation schemas between client forms and server API routes

Rejected: Formik (legacy, re-render issues), TanStack Form (overkill for 1 form), native forms (painful for dynamic fields).

### Validation: Zod (shared client + server)

```typescript
// Shared schema — used by landing page form AND POST /api/compare
const compareSchema = z.object({
  channels: z.array(z.string().regex(/^@?[a-zA-Z0-9_-]+$/))
    .min(2, "At least 2 channels required")
    .max(4, "Maximum 4 channels"),
  apiKey: z.string().optional(),
})
```

Convex functions use Convex's own validator (`v.string()`, etc.) — Zod is for Next.js API routes only.

### Client State: None (no Zustand/Jotai/Redux)

Zero global client state exists in V1. Everything is handled by:
- Convex hooks (server data)
- URL params via Next.js searchParams (comparison state)
- `next-themes` (theme toggle, ~2KB, standard with shadcn)
- Component-local useState (UI interactions)
- Intersection Observer (section visibility for analytics)

### API Middleware: Composable Utilities

Two lightweight wrappers for the 2 API routes:
- `withValidation(zodSchema, handler)` — parse + validate request body
- `withRateLimit(handler)` — per-IP rate limiting via Redis

No middleware framework needed for 2 routes.

## Rejected Alternatives

| What | Rejected | Why |
|------|----------|-----|
| TanStack Query | Redundant with Convex hooks | Two caching layers fighting each other |
| Formik | Legacy, controlled inputs | Re-render issues, less maintained |
| TanStack Form | More features than needed | 1 form doesn't justify the dependency |
| Zustand/Jotai/Redux | YAGNI | Zero global client state in V1 |
| next-safe-action | Nice but unnecessary | 2 API routes don't need a framework |
| nuqs (URL state) | Overkill | Simple channel params via native searchParams |
| Yup | Less TypeScript-friendly | Zod is more type-safe and widely adopted |

## Consequences

- Minimal dependency footprint — Convex hooks + RHF + Zod + next-themes covers everything
- Shared Zod schemas ensure client-server validation consistency
- No unnecessary abstractions for V1's simple state needs
- If V2 needs global state (complex comparison builder), add Zustand then
