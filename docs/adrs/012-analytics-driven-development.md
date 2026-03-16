# ADR-012: Analytics-Driven Development (ADD)

**Status**: Accepted
**Date**: 2026-03-17
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Analytics is not an afterthought — it's a core development discipline alongside TDD. Every feature must ship with analytics instrumentation. If we can't measure whether a feature is working, we can't make informed product decisions.

This is the difference between a side project ("I think people like it") and a startup ("42% of users share their report within 5 minutes, and shared links convert at 8%").

## Decision

### Tools

| Layer | Tool | Purpose | Cost |
|-------|------|---------|------|
| Web Vitals + Performance | Vercel Analytics | LCP, CLS, FID, page load times | Free (included) |
| Product Analytics | PostHog | Events, funnels, cohorts, session replays, feature flags | Free (1M events/mo) |

### Why PostHog

1. **1M free events/month** — enough for serious traction before any cost
2. **Self-hostable** — if pricing changes, deploy on own infrastructure
3. **Session replays** — watch real users interact with loading screen, report, share flow
4. **Feature flags** — gradual rollout for AI personalization, auth gating
5. **Funnels** — built-in funnel analysis, no custom SQL
6. **Privacy-friendly** — cookieless mode available, GDPR-compliant
7. **API access** — future AI agents can query metrics programmatically

### Rejected Alternatives

| Tool | Why Rejected |
|------|-------------|
| Google Analytics | Privacy concerns, overkill complexity, cookie consent overhead |
| Mixpanel | 20M events free but no self-host option, higher lock-in |
| Plausible | No free tier, no funnels, no session replay |
| Umami | Self-hosted only (infra overhead), no funnels or replays |
| Vercel Analytics alone | Only 2,500 events/mo, no funnels, no session replay |

## Analytics-Driven Development Process

Every feature PR includes analytics instrumentation alongside tests:

```
Feature PR includes:
├── Code: feature implementation
├── Tests: unit + component tests (TDD)
└── Analytics: event definitions + instrumentation (ADD)
    ├── Events defined in typed schema
    ├── posthog.capture() calls in components
    └── Funnel step documented
```

### Development Cycle

```
TDD:  Write test → Write code → Verify test passes
ADD:  Define metric → Instrument event → Ship feature → Verify data flows
```

Both cycles run in parallel for every feature.

## Event Schema

### Naming Convention

- Pattern: `{noun}_{verb_past_tense}`
- Properties: camelCase, TypeScript typed
- All events include automatic context: timestamp, userId (if logged in), sessionId, page

### Core Events

```typescript
type HikakuEvent =
  // Comparison flow
  | { event: "comparison_started"; channels: string[]; channelCount: number }
  | { event: "comparison_completed"; reportId: string; durationMs: number; channelCount: number }
  | { event: "comparison_failed"; error: string; channels: string[] }

  // Report engagement
  | { event: "report_viewed"; reportId: string; source: "direct" | "shared_link" | "history" }
  | { event: "report_section_visible"; reportId: string; section: string }
  | { event: "report_scrolled"; reportId: string; depthPercent: number }

  // Sharing
  | { event: "report_shared"; reportId: string; method: "copy_link" | "twitter" | "linkedin" | "whatsapp" }
  | { event: "shared_link_opened"; reportId: string; referrer: string | null }
  | { event: "report_expired_viewed"; reportId: string; channels: string[] }
  | { event: "report_regenerated"; reportId: string; channels: string[] }

  // Downloads
  | { event: "pdf_downloaded"; reportId: string; channelCount: number }

  // Auth
  | { event: "signup_started"; source: string }
  | { event: "signup_completed"; method: string }
  | { event: "report_saved"; reportId: string }

  // API key
  | { event: "api_key_provided"; source: "landing" | "quota_exceeded" }

  // Loading UX
  | { event: "loading_started"; channelCount: number }
  | { event: "loading_abandoned"; durationMs: number; lastStage: string }
  | { event: "loading_completed"; durationMs: number }
```

## Key Funnels

### 1. Core Funnel
```
landing_visited → comparison_started → comparison_completed → report_shared
```
Measures: overall product conversion

### 2. Viral Funnel
```
report_shared → shared_link_opened → comparison_started (new user)
```
Measures: viral coefficient (k-factor)

### 3. Conversion Funnel
```
report_viewed → signup_started → signup_completed → report_saved
```
Measures: anonymous → logged-in conversion

### 4. Loading Retention
```
loading_started → (by stage) → loading_abandoned | loading_completed
```
Measures: loading UX effectiveness, drop-off points

### 5. Expiry Conversion
```
report_expired_viewed → report_regenerated
```
Measures: expired link recovery rate (future paywall metric)

## Dashboard Metrics

| Metric | Formula | Review |
|--------|---------|--------|
| Daily Active Comparisons | count(comparison_completed) / day | Daily |
| Viral Coefficient | shared_link_opened / comparison_completed | Weekly |
| Loading Drop-off Rate | loading_abandoned / loading_started | Weekly |
| Share Rate | report_shared / comparison_completed | Weekly |
| PDF Download Rate | pdf_downloaded / comparison_completed | Weekly |
| Median Loading Time | p50(loading_completed.durationMs) | Weekly |
| Report Scroll Depth | avg(report_scrolled.depthPercent) | Weekly |
| Top Compared Channels | group by channels, count | Weekly |
| Expiry Re-gen Rate | report_regenerated / report_expired_viewed | Weekly |
| Signup Conversion | signup_completed / report_viewed | Weekly |

## Implementation

### PostHog Setup
- Client-side SDK for component events (clicks, scroll, visibility)
- Server-side SDK for API events (comparison completed, report created)
- Cookieless mode enabled by default (privacy-first)
- Session replay enabled for first 1,000 sessions/month (free tier)

### Analytics Utility

```typescript
// lib/analytics.ts — typed wrapper around PostHog
import posthog from 'posthog-js'

export function trackEvent(event: HikakuEvent) {
  posthog.capture(event.event, event)
}
```

All components use this typed wrapper — never call `posthog.capture` directly. This ensures type safety and makes it easy to swap analytics providers later.

## Consequences

- Every feature ships with measurable instrumentation
- Product decisions backed by data, not intuition
- PostHog free tier (1M events) sufficient for early growth
- Self-hostable if costs become a concern
- Session replays provide qualitative UX insights alongside quantitative metrics
- Typed event schema prevents analytics drift and ensures consistency
