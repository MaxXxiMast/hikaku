# ADR-011: Persistent Backend — Convex (AI-First Decision)

**Status**: Accepted
**Date**: 2026-03-17
**Deciders**: Purujit Negi, Claude (AI pair)
**Supersedes**: Portions of ADR-002 (Upstash Redis remains as cache layer)

## Context

Hikaku needs a persistent backend for features beyond the 24-hour report cache:
- User accounts and authentication
- Search history and saved report references
- AI personalization preferences
- Custom report section configurations
- Usage analytics

The project has an explicit **AI-first development philosophy** — the goal is to reach a point where new feature implementations are near no-code, driven entirely by AI agents.

## Options Considered

### Supabase (Postgres)
- **Pros**: Standard SQL, self-hostable, 50K MAU auth, pgvector for AI, low lock-in, large community
- **Cons**: More boilerplate per feature (SQL migration + type codegen + API route + client hook), translation layers between SQL and TypeScript

### Convex
- **Pros**: TypeScript end-to-end (schema, functions, client), auto-generated types, zero API routes needed, built-in auth/vector search/scheduling, minimal files per feature
- **Cons**: Proprietary, not self-hostable, higher vendor lock-in

## Decision

**Convex** — driven by the AI-first development principle.

## Rationale

### AI Development Velocity

The core metric: **how many files and translation layers does an AI need to touch to implement a feature?**

**Adding "user bookmarks" feature:**

| Step | Supabase | Convex |
|------|----------|--------|
| Define schema | SQL migration file | Edit schema.ts (TypeScript) |
| Generate types | Run codegen CLI | Automatic (zero step) |
| Write server logic | API route + Supabase client + auth check + error handling | One function file (auth built-in) |
| Wire to client | Custom fetch hook | useQuery/useMutation (auto-typed) |
| **Total files** | **5-7** | **3** |
| **Translation layers** | SQL → TypeScript → API → Client | TypeScript → TypeScript → TypeScript |
| **AI failure modes** | Type drift, SQL errors, auth bugs, route wiring | Compiler catches almost everything |

### Why This Matters for No-Code-Through-AI

1. **Schema is TypeScript** — AI's native language. No SQL↔TypeScript translation where AI makes mistakes.
2. **End-to-end type safety** — compiler catches AI errors before runtime. Guardrails that make AI more reliable.
3. **Zero API routes** — Convex functions are called directly from components. AI writes one function and one component, done.
4. **Self-describing system** — AI reads schema.ts + function files = complete understanding of the backend. No hidden SQL migrations or generated types to track.
5. **Fewer files per feature** — 3 vs 7 files means AI completes features in fewer turns with fewer coordination errors.

### Lock-In Mitigation

The lock-in is real and acknowledged. Mitigations:
1. All business logic documented in ADRs independent of Convex syntax
2. Schema and function logic are well-documented TypeScript — portable as specifications even if code isn't
3. Convex data is exportable (JSON snapshots)
4. If migration is ever needed, the AI-first documentation means any competent AI can rewrite the functions for a new platform using the specs

### Self-Hosting Risk Assessment

| Scenario | Probability | Impact | Mitigation |
|----------|------------|--------|------------|
| Convex raises prices | Medium (3-5yr) | Medium | Business logic documented, data exportable |
| Convex shuts down | Very low | High | Full spec documentation enables rewrite |
| Need data residency (India) | Low (V1) | Medium | Convex expanding regions; evaluate at that time |
| Acquisition requires on-premise | Very low (V1) | High | Rewrite with documented specs |
| Project doesn't succeed | High | None | Lock-in irrelevant |

The biggest risk to a startup isn't vendor lock-in — it's not shipping fast enough. Convex optimizes for shipping speed, especially with AI-assisted development.

## Architecture (with Upstash Redis)

```
Upstash Redis (Cache Layer)
├── Hot computed metrics cache (4h TTL)  ← Native TTL, auto-cleanup
├── Rate limiting                   ← Fast, ephemeral
└── Session tokens                  ← Fast lookup

Convex (Persistent Backend)
├── Users + auth (Clerk)           ← Permanent
├── Search history                 ← Permanent, per-user
├── Saved report references        ← Permanent, per-user
├── AI personalization prefs       ← Permanent, per-user
├── Custom report configs          ← Permanent, per-user
├── Vector embeddings (AI)         ← Built-in vector search
├── Scheduled jobs                 ← Cleanup, notifications
└── Usage analytics                ← Permanent
```

Redis does what Redis does best (fast cache with TTL). Convex does what Redis can't (persistent data, relationships, auth, real-time, scheduling).

## Phased Rollout

### V1 (Launch)
- Convex schema defined but minimal usage
- Store anonymous report metadata for analytics
- Redis handles all report caching
- No auth required

### V1.5 (Post-launch)
- Convex auth via Clerk — optional login
- Logged-in users: search history, saved reports
- No paywall yet

### V2 (Growth)
- AI personalization — custom sections stored in Convex
- Vector search for "similar channels" recommendations
- Re-generation behind auth (freemium gate)

## Cost Projection

| Stage | Convex | Upstash Redis | Total |
|-------|--------|-------------|-------|
| Free (0-1K users) | $0 (1M calls, 1GB) | $0 (10K/day, 256MB) | **$0** |
| Growth (1K-10K) | $25/mo (Pro) | $10/mo | **$35/mo** |
| Scale (10K-100K) | $50-100/mo | $20-50/mo | **$70-150/mo** |

## Consequences

- AI agents can implement features with 2-3 file changes (schema + function + component)
- End-to-end TypeScript eliminates translation-layer bugs
- Vendor lock-in on database + function layer (mitigated by documentation)
- No self-hosting option (accepted trade-off for AI development velocity)
- Convex MCP server enables AI to read/modify backend directly
