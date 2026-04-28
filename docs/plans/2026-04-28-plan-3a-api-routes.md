# Plan 3A: API Routes + Computation Enrichment

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Plan 2's computation engine into working API routes. User can POST 2 channel handles and receive a full ComputedReport. Enrich computation modules with overlapping-period and first-N-months analysis.

**Branch:** `feature/plan-3a-api-routes` (from `master`)

**Spec:** `docs/specs/hikaku-v1-design.md` (Sections 6, 8.10, 8.11)
**Brainstorm:** `docs/brainstorm/2026-04-28-plan-3-brainstorm.md`

**Core Principles (non-negotiable):**
- **KISS**: Simple POST → JSON. No SSE. No streaming.
- **YAGNI**: Only what the spec defines. No middleware abstractions.
- **SOLID**: Route handler orchestrates, doesn't compute. Computation stays in `lib/youtube/`.
- **DRY**: Shared validation schema. Single analytics wrapper.
- **TDD**: Red → Green → Refactor for every feature.

**Retro learnings applied:**
- Implementer agents must flag any spec deviation, NOT silently adjust
- At least 2 exact-value assertions per module (not just range checks)
- After parallel tasks, run cross-module DRY scan

**Note:** `@vercel/og` is not installed. Plan 3A includes installing it. Convex cron jobs in `convex/crons.ts` are commented out — this plan activates them.

---

## File Map

### Created in this plan

```
src/
├── app/
│   └── api/
│       ├── compare/
│       │   └── route.ts          # POST: validate → rate limit → fetch → compute → store → return
│       └── report/
│           └── [id]/
│               └── route.ts      # GET: Redis → Convex fallback
├── lib/
│   └── youtube/
│       ├── engagement.ts         # MODIFY: add overlappingMonthly
│       └── growth.ts             # MODIFY: add firstNMonths
└── __tests__/
    └── lib/
        └── youtube/
            ├── engagement.test.ts  # MODIFY: add overlapping tests
            └── growth.test.ts      # MODIFY: add firstNMonths tests
    └── api/
        ├── compare.test.ts        # API route integration tests
        └── report.test.ts         # Report fetch tests
```

### Modified in this plan

```
src/lib/validations.ts            # Harden: .max(30), .trim(), dedup, API key format
src/lib/rate-limit.ts             # Add retry-after seconds return
src/lib/youtube/types.ts          # Add overlappingMonthly + firstNMonths to interfaces
src/lib/youtube/metrics.ts        # Pass enriched data through orchestrator
src/lib/analytics.ts              # No changes needed — events already defined
convex/reports.ts                 # Fix getPublic to return only computed data
convex/crons.ts                   # Activate cron jobs + implement internal mutations
package.json                      # Install @vercel/og
```

### Dependency Graph

```
types.ts (interface changes)
    ↑
    ├── engagement.ts (overlappingMonthly enrichment)
    ├── growth.ts (firstNMonths enrichment)
    ↑
    metrics.ts (wire enriched data)
    ↑
    ├── validations.ts (hardened)
    ├── rate-limit.ts (retry-after)
    ├── convex/reports.ts (fix getPublic)
    ├── convex/crons.ts (activate)
    ↑
    api/compare/route.ts (orchestrator)
    api/report/[id]/route.ts (fetch)
```

---

## Chunk 1: Computation Enrichment

### Task 1.1: Add overlapping-period and first-N-months types

**Files:**
- Modify: `src/lib/youtube/types.ts`

- [ ] **Step 1: Add overlappingMonthly to EngagementData**

In `src/lib/youtube/types.ts`, add `overlappingMonthly` field to `EngagementData`:

```typescript
export interface EngagementData {
  perChannel: {
    channelId: string
    overallRate: number
    likeRate: number
    commentRate: number
    medianPerVideoRate: number
  }[]
  monthly: { month: string; channelId: string; engagementRate: number; views: number }[]
  overlappingMonthly: { month: string; channelId: string; engagementRate: number; views: number }[]
  byDuration: { bucket: string; channelId: string; count: number; avgViews: number; engagementRate: number }[]
  topEngaged: { channelId: string; title: string; views: number; engagementRate: number }[]
}
```

- [ ] **Step 2: Add firstNMonths to GrowthData**

In the same file, add `firstNMonths` field to `GrowthData`:

```typescript
export interface GrowthData {
  monthlyComparison: MonthlyData[]
  lifecyclePhases: {
    channelId: string
    phases: { name: string; period: string; avgMonthlyViews: number; character: string }[]
  }[]
  firstNMonths: {
    n: number                    // min(channel ages) in months
    perChannel: {
      channelId: string
      months: MonthlyData[]      // first N months from each channel's start
      totalViews: number
      avgViewsPerVideo: number
    }[]
  }
}
```

- [ ] **Step 3: Run tsc → verify type errors in engagement.ts, growth.ts, metrics.ts, tests**

```bash
pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: type errors because `overlappingMonthly` and `firstNMonths` are required but not returned by existing functions.

- [ ] **Step 4: Commit**

```bash
git add src/lib/youtube/types.ts
git commit -m "feat: add overlappingMonthly and firstNMonths to EngagementData and GrowthData interfaces"
```

---

### Task 1.2: Implement overlapping-period engagement

**Files:**
- Modify: `src/lib/youtube/engagement.ts`
- Modify: `src/__tests__/lib/youtube/engagement.test.ts`

- [ ] **Step 1: Write tests for overlappingMonthly**

Add to `src/__tests__/lib/youtube/engagement.test.ts`:

```typescript
describe("overlappingMonthly", () => {
  it("only includes months where ALL channels have videos", () => {
    expect(result.overlappingMonthly.length).toBeGreaterThan(0)
    // Get unique months per channel
    const monthsByChannel = new Map<string, Set<string>>()
    result.monthly.forEach((m) => {
      if (!monthsByChannel.has(m.channelId)) monthsByChannel.set(m.channelId, new Set())
      monthsByChannel.get(m.channelId)!.add(m.month)
    })
    // Every overlapping month must exist in ALL channels' monthly data
    const channelIds = Array.from(monthsByChannel.keys())
    result.overlappingMonthly.forEach((m) => {
      channelIds.forEach((chId) => {
        expect(monthsByChannel.get(chId)!.has(m.month)).toBe(true)
      })
    })
  })

  it("returns empty when no months overlap", () => {
    // Channel A has videos in 2024-01, Channel B has videos in 2025-10
    // These don't overlap — overlappingMonthly should be empty
    const noOverlap = computeEngagement(
      [sampleChannelA, sampleChannelB],
      {
        [sampleChannelA.id]: [{ ...sampleVideosA[0], publishedAt: "2022-01-15T00:00:00Z" }],
        [sampleChannelB.id]: [{ ...sampleVideosB[0], publishedAt: "2025-10-15T00:00:00Z" }],
      }
    )
    expect(noOverlap.overlappingMonthly).toHaveLength(0)
  })

  it("has same shape as monthly entries", () => {
    result.overlappingMonthly.forEach((m) => {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/)
      expect(m.engagementRate).toBeGreaterThanOrEqual(0)
      expect(typeof m.views).toBe("number")
    })
  })
})
```

- [ ] **Step 2: Run test → verify FAIL**

```bash
pnpm test -- src/__tests__/lib/youtube/engagement.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Implement overlappingMonthly in engagement.ts**

After the existing `monthly` computation, add:

```typescript
// Overlapping monthly — only months where ALL channels have at least 1 video
const monthsPerChannel = new Map<string, Set<string>>()
for (const ch of channels) {
  const months = new Set<string>()
  for (const v of videosByChannel[ch.id] ?? []) {
    months.add(v.publishedAt.slice(0, 7))
  }
  monthsPerChannel.set(ch.id, months)
}
const allChannelMonthSets = Array.from(monthsPerChannel.values())
const overlappingMonthSet = allChannelMonthSets.length > 0
  ? allChannelMonthSets.reduce((intersection, monthSet) => {
      const result = new Set<string>()
      for (const m of intersection) {
        if (monthSet.has(m)) result.add(m)
      }
      return result
    })
  : new Set<string>()
const overlappingMonthly = monthly.filter((m) => overlappingMonthSet.has(m.month))
```

Add `overlappingMonthly` to the return object.

- [ ] **Step 4: Run test → verify PASS**

```bash
pnpm test -- src/__tests__/lib/youtube/engagement.test.ts 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube/engagement.ts src/__tests__/lib/youtube/engagement.test.ts
git commit -m "feat: add overlapping-period monthly engagement (months where all channels active)"
```

---

### Task 1.3: Implement first-N-months growth

**Files:**
- Modify: `src/lib/youtube/growth.ts`
- Modify: `src/__tests__/lib/youtube/growth.test.ts`

- [ ] **Step 1: Write tests for firstNMonths**

Add to `src/__tests__/lib/youtube/growth.test.ts`:

```typescript
describe("firstNMonths", () => {
  it("N equals the younger channel's age in months", () => {
    // FRA joined 2025-07-29, reference is 2026-03-01 → ~8 months
    // WW joined 2021-03-21, reference is 2026-03-01 → ~60 months
    // N should be ~8 (the younger channel)
    expect(result.firstNMonths.n).toBeGreaterThan(0)
    expect(result.firstNMonths.n).toBeLessThanOrEqual(12) // FRA is < 12 months old
  })

  it("each channel has at most N months of data", () => {
    result.firstNMonths.perChannel.forEach((ch) => {
      expect(ch.months.length).toBeLessThanOrEqual(result.firstNMonths.n)
    })
  })

  it("months are from each channel's own start date", () => {
    // WW's first month should be 2021-03 or later
    const wwData = result.firstNMonths.perChannel.find((c) => c.channelId === sampleChannelA.id)!
    if (wwData.months.length > 0) {
      expect(wwData.months[0].month >= "2021-03").toBe(true)
    }
    // FRA's first month should be 2025-07 or later
    const fraData = result.firstNMonths.perChannel.find((c) => c.channelId === sampleChannelB.id)!
    if (fraData.months.length > 0) {
      expect(fraData.months[0].month >= "2025-07").toBe(true)
    }
  })

  it("computes totalViews and avgViewsPerVideo", () => {
    result.firstNMonths.perChannel.forEach((ch) => {
      expect(ch.totalViews).toBeGreaterThanOrEqual(0)
      expect(ch.avgViewsPerVideo).toBeGreaterThanOrEqual(0)
    })
  })

  it("handles single month of data", () => {
    const single = computeGrowth(
      [sampleChannelA],
      { [sampleChannelA.id]: [sampleVideosA[0]] },
      REFERENCE_DATE
    )
    expect(single.firstNMonths.perChannel[0].months.length).toBeLessThanOrEqual(single.firstNMonths.n)
  })
})
```

- [ ] **Step 2: Run test → verify FAIL**

```bash
pnpm test -- src/__tests__/lib/youtube/growth.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Implement firstNMonths in growth.ts**

After the existing `lifecyclePhases` computation, add:

```typescript
// First-N-Months comparison — normalize by channel age
const channelAges = channels.map((ch) => {
  const joinDate = new Date(ch.joinedDate)
  const ageMonths = (referenceDate.getFullYear() - joinDate.getFullYear()) * 12
    + (referenceDate.getMonth() - joinDate.getMonth())
  return Math.max(1, ageMonths)
})
const n = Math.min(...channelAges)

const firstNMonths = {
  n,
  perChannel: channels.map((ch) => {
    const joinDate = new Date(ch.joinedDate)
    const joinMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, "0")}`

    // Get this channel's monthly data sorted chronologically
    const chMonths = monthlyComparison
      .filter((m) => m.channelId === ch.id)
      .sort((a, b) => a.month.localeCompare(b.month))

    // Take first N months starting from join month
    const firstN = chMonths.filter((m) => m.month >= joinMonth).slice(0, n)
    const totalViews = firstN.reduce((s, m) => s + m.totalViews, 0)
    const totalVideos = firstN.reduce((s, m) => s + m.videoCount, 0)

    return {
      channelId: ch.id,
      months: firstN,
      totalViews,
      avgViewsPerVideo: totalVideos > 0 ? totalViews / totalVideos : 0,
    }
  }),
}
```

Update the function signature to use `referenceDate` (currently unused as `_referenceDate`):
- Change `_referenceDate: Date` to `referenceDate: Date` in the parameter list
- Add `firstNMonths` to the return object

- [ ] **Step 4: Run test → verify PASS**

```bash
pnpm test -- src/__tests__/lib/youtube/growth.test.ts 2>&1 | tail -10
```

- [ ] **Step 5: Run full suite**

```bash
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/youtube/growth.ts src/__tests__/lib/youtube/growth.test.ts
git commit -m "feat: add first-N-months growth comparison (age-normalized)"
```

---

### Task 1.4: Wire enrichments through orchestrator

**Files:**
- Modify: `src/lib/youtube/metrics.ts`
- Modify: `src/__tests__/lib/youtube/metrics.test.ts`

- [ ] **Step 1: Add orchestrator test assertions**

Add to `src/__tests__/lib/youtube/metrics.test.ts`:

```typescript
it("engagement has overlappingMonthly data", () => {
  expect(report.engagement.overlappingMonthly).toBeDefined()
  expect(Array.isArray(report.engagement.overlappingMonthly)).toBe(true)
})

it("growth has firstNMonths data", () => {
  expect(report.growth.firstNMonths).toBeDefined()
  expect(report.growth.firstNMonths.n).toBeGreaterThan(0)
  expect(report.growth.firstNMonths.perChannel).toHaveLength(2)
})
```

- [ ] **Step 2: Run test → verify PASS (should already pass since engagement.ts and growth.ts now return enriched data)**

```bash
pnpm test -- src/__tests__/lib/youtube/metrics.test.ts 2>&1 | tail -10
```

If it fails, the orchestrator needs no changes — `computeEngagement` and `computeGrowth` already return the enriched interfaces and `metrics.ts` passes them through.

- [ ] **Step 3: Run full suite → verify all pass**

```bash
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/youtube/metrics.ts src/__tests__/lib/youtube/metrics.test.ts
git commit -m "feat: wire overlappingMonthly and firstNMonths through orchestrator"
```

---

## Chunk 2: Input Validation + Rate Limiting Hardening

### Task 2.1: Harden validations.ts

**Files:**
- Modify: `src/lib/validations.ts`
- Modify: `src/__tests__/lib/validations.test.ts`

- [ ] **Step 1: Write tests for hardened validation**

Add to `src/__tests__/lib/validations.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { compareSchema, channelHandleSchema } from "@/lib/validations"

describe("channelHandleSchema", () => {
  it("accepts valid handle with @", () => {
    expect(channelHandleSchema.safeParse("@WintWealthYT").success).toBe(true)
  })

  it("accepts valid handle without @", () => {
    expect(channelHandleSchema.safeParse("WintWealthYT").success).toBe(true)
  })

  it("trims whitespace", () => {
    const result = channelHandleSchema.safeParse("  @WintWealthYT  ")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("@WintWealthYT")
  })

  it("rejects handles longer than 30 chars", () => {
    expect(channelHandleSchema.safeParse("@" + "a".repeat(31)).success).toBe(false)
  })

  it("rejects empty string", () => {
    expect(channelHandleSchema.safeParse("").success).toBe(false)
  })

  it("rejects special characters", () => {
    expect(channelHandleSchema.safeParse("@test<script>").success).toBe(false)
  })
})

describe("compareSchema", () => {
  it("accepts 2 valid handles", () => {
    const result = compareSchema.safeParse({ channels: ["@foo", "@bar"] })
    expect(result.success).toBe(true)
  })

  it("rejects duplicate handles", () => {
    const result = compareSchema.safeParse({ channels: ["@foo", "@foo"] })
    expect(result.success).toBe(false)
  })

  it("rejects more than 2 channels in V1", () => {
    const result = compareSchema.safeParse({ channels: ["@a", "@b", "@c"] })
    expect(result.success).toBe(false)
  })

  it("rejects fewer than 2 channels", () => {
    const result = compareSchema.safeParse({ channels: ["@only"] })
    expect(result.success).toBe(false)
  })

  it("validates API key format when provided", () => {
    const valid = compareSchema.safeParse({
      channels: ["@a", "@b"],
      apiKey: "AIzaSyA1234567890abcdefghijklmnopqrstuv",
    })
    expect(valid.success).toBe(true)

    const invalid = compareSchema.safeParse({
      channels: ["@a", "@b"],
      apiKey: "not-a-valid-key",
    })
    expect(invalid.success).toBe(false)
  })

  it("accepts missing API key", () => {
    const result = compareSchema.safeParse({ channels: ["@a", "@b"] })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test → verify FAIL**

```bash
pnpm test -- src/__tests__/lib/validations.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Implement hardened validations**

Replace `src/lib/validations.ts`:

```typescript
import { z } from "zod"

export const channelHandleSchema = z
  .string()
  .trim()
  .min(1, "Channel handle cannot be empty")
  .max(30, "Handle too long")
  .regex(/^@?[a-zA-Z0-9_.-]+$/, "Invalid channel handle format")

export const apiKeySchema = z
  .string()
  .regex(/^AIza[0-9A-Za-z_-]{35}$/, "Invalid API key format")

export const compareSchema = z.object({
  channels: z
    .array(channelHandleSchema)
    .min(2, "At least 2 channels required")
    .max(2, "Maximum 2 channels for V1")
    .refine(
      (arr) => new Set(arr.map((h) => h.toLowerCase().replace(/^@/, ""))).size === arr.length,
      "Duplicate handles not allowed"
    ),
  apiKey: apiKeySchema.optional(),
})

export type CompareInput = z.infer<typeof compareSchema>
```

- [ ] **Step 4: Run test → verify PASS**

```bash
pnpm test -- src/__tests__/lib/validations.test.ts 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/__tests__/lib/validations.test.ts
git commit -m "feat: harden input validation (max length, trim, dedup, API key format)"
```

---

### Task 2.2: Add retry-after to rate limiter

**Files:**
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Update rate limiter to return remaining seconds**

Replace `src/lib/rate-limit.ts`:

```typescript
import { redis } from "./redis"

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export const checkRateLimit = async (
  ip: string,
  maxRequests = 10,
  windowSeconds = 3600
): Promise<RateLimitResult> => {
  const key = `ratelimit:${ip}`
  const [current, ttl] = await Promise.all([
    redis.incr(key),
    redis.ttl(key),
  ])

  // Set expiry on first request (ttl = -1 means no expiry set)
  if (ttl === -1) {
    await redis.expire(key, windowSeconds)
  }

  return {
    allowed: current <= maxRequests,
    retryAfterSeconds: current > maxRequests ? Math.max(ttl, 0) : 0,
  }
}
```

- [ ] **Step 2: Run existing tests to check no regressions**

```bash
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add retry-after seconds to rate limiter response"
```

---

### Task 2.3: Fix getPublic query + activate cron jobs

**Files:**
- Modify: `convex/reports.ts`
- Modify: `convex/crons.ts`

- [ ] **Step 1: Fix getPublic to return only computed data**

Update the `getPublic` query in `convex/reports.ts` to NOT return raw data:

```typescript
export const getPublic = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id)
    if (!report) return null
    if (!report.isPublic && Date.now() > report.publicExpiresAt) {
      return { expired: true, channelHandles: report.channelHandles }
    }
    return {
      computed: report.computed,
      channelHandles: report.channelHandles,
      generatedAt: report.generatedAt,
      isPublic: report.isPublic,
      publicExpiresAt: report.publicExpiresAt,
    }
  },
})
```

- [ ] **Step 2: Add internal mutations and activate crons**

Add to `convex/reports.ts`:

```typescript
import { internalMutation } from "./_generated/server"

export const expirePublicLinks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const expired = await ctx.db
      .query("reports")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect()

    for (const report of expired) {
      if (report.publicExpiresAt < now) {
        await ctx.db.patch(report._id, { isPublic: false })
      }
    }
  },
})

export const purgeExpiredData = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const toPurge = await ctx.db
      .query("reports")
      .withIndex("by_purge")
      .collect()

    for (const report of toPurge) {
      if (report.purgeAfter && report.purgeAfter < now) {
        await ctx.db.patch(report._id, {
          raw: { channels: [], videos: [] },
          computed: null,
        })
      }
    }
  },
})
```

Update `convex/crons.ts` to activate both jobs:

```typescript
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("expire public links", { minutes: 15 }, internal.reports.expirePublicLinks)
crons.interval("purge old reports", { hours: 1 }, internal.reports.purgeExpiredData)

export default crons
```

- [ ] **Step 3: Run Convex deploy to verify**

```bash
npx convex dev --once 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add convex/reports.ts convex/crons.ts
git commit -m "feat: fix getPublic data exposure, activate expiry + purge cron jobs"
```

---

## Chunk 3: API Route — POST /api/compare

### Task 3.1: Install @vercel/og dependency

- [ ] **Step 1: Install**

```bash
pnpm add @vercel/og
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install @vercel/og for dynamic social preview images"
```

---

### Task 3.2: Implement POST /api/compare

**Files:**
- Create: `src/app/api/compare/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { compareSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { resolveChannel, fetchAllVideos } from "@/lib/youtube/client"
import { computeReport } from "@/lib/youtube/metrics"
import { cacheReport } from "@/lib/redis"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../../convex/_generated/api"
import { trackEvent } from "@/lib/analytics"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export const POST = async (req: NextRequest) => {
  // CSRF check
  const origin = req.headers.get("origin")
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
  ].filter(Boolean)
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse + validate input
  const body = await req.json().catch(() => null)
  const parsed = compareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { channels: handles, apiKey } = parsed.data
  const youtubeApiKey = apiKey ?? process.env.YOUTUBE_API_KEY
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "No YouTube API key available" },
      { status: 503 }
    )
  }

  // Rate limit
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const rateLimit = await checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    )
  }

  const startTime = Date.now()

  try {
    // Resolve all channels (atomic — all must succeed)
    const resolvedChannels: RawChannel[] = []
    for (const handle of handles) {
      const channel = await resolveChannel(handle, youtubeApiKey)
      resolvedChannels.push(channel)
    }

    // Fetch all videos per channel (no since filter — section-level windowing)
    const videosByChannel: Record<string, RawVideo[]> = {}
    for (const channel of resolvedChannels) {
      const videos = await fetchAllVideos(channel.uploadsPlaylistId, youtubeApiKey)
      videosByChannel[channel.id] = videos
    }

    // Compute full report
    const referenceDate = new Date()
    const report = computeReport(resolvedChannels, videosByChannel, { referenceDate })

    // Store in Convex (graceful — don't block response on failure)
    let reportId: string | null = null
    try {
      reportId = await convex.mutation(api.reports.create, {
        channelHandles: resolvedChannels.map((c) => c.handle),
        raw: {
          channels: resolvedChannels as unknown[],
          videos: Object.values(videosByChannel).flat() as unknown[],
        },
        computed: report as unknown,
      })
    } catch (err) {
      console.error("Convex storage failed:", err)
    }

    // Cache in Redis (graceful)
    if (reportId) {
      try {
        await cacheReport(reportId, report)
      } catch (err) {
        console.error("Redis cache failed:", err)
      }
    }

    return NextResponse.json({
      reportId,
      data: report,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Comparison failed"

    // Map known errors to appropriate status codes
    if (message.includes("Channel not found")) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes("Quota exceeded") || message.includes("YouTube API error (403)")) {
      return NextResponse.json(
        { error: "YouTube API daily limit reached. Try again tomorrow or provide your own API key." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Comparison failed. Please try again." },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Run tsc → verify no type errors**

```bash
pnpm exec tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/compare/route.ts
git commit -m "feat: implement POST /api/compare route (validate → fetch → compute → store)"
```

---

### Task 3.3: Implement GET /api/report/[id]

**Files:**
- Create: `src/app/api/report/[id]/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getCachedReport } from "@/lib/redis"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params

  // Try Redis first (fast path)
  try {
    const cached = await getCachedReport(id)
    if (cached) {
      return NextResponse.json({
        found: true,
        data: {
          computed: cached,
          channelHandles: [], // Redis doesn't store handles, client can read from URL ?ch= param
          generatedAt: 0,
          isPublic: true,
          publicExpiresAt: 0,
        },
      })
    }
  } catch {
    // Redis failure — fall through to Convex
  }

  // Convex fallback (source of truth)
  try {
    const report = await convex.query(api.reports.getPublic, {
      id: id as any, // Convex ID type
    })

    if (!report) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    if ("expired" in report && report.expired) {
      return NextResponse.json({
        found: false,
        expired: true,
        channelHandles: report.channelHandles,
      })
    }

    return NextResponse.json({
      found: true,
      data: report,
    })
  } catch {
    return NextResponse.json({ found: false }, { status: 404 })
  }
}
```

- [ ] **Step 2: Run tsc → verify no type errors**

```bash
pnpm exec tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/report/\[id\]/route.ts
git commit -m "feat: implement GET /api/report/[id] route (Redis cache → Convex fallback)"
```

---

## Chunk 4: Final Verification

### Task 4.1: Run full test suite + tsc + build

- [ ] **Step 1: Run all tests**

```bash
pnpm test --run
```

Expected: All tests pass (existing 119 + new tests from Tasks 1.2, 1.3, 1.4, 2.1).

- [ ] **Step 2: Type check**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

- [ ] **Step 4: Push**

```bash
git push -u origin feature/plan-3a-api-routes
```

---

## Verification Checklist

- [ ] `pnpm test` — all pass
- [ ] `pnpm exec tsc --noEmit` — clean
- [ ] `pnpm build` — succeeds
- [ ] `EngagementData.overlappingMonthly` returns only months where ALL channels have videos
- [ ] `GrowthData.firstNMonths` slices by `min(channel ages)` from each channel's start
- [ ] POST `/api/compare` validates input, rate limits, fetches, computes, stores, returns `{ reportId, data }`
- [ ] GET `/api/report/[id]` reads from Redis then Convex fallback, returns only computed data (not raw)
- [ ] Convex cron jobs are activated and implement expiry + purge
- [ ] Handle validation: `.trim().max(30)`, rejects duplicates, validates API key format
- [ ] Rate limiter returns `retryAfterSeconds`
- [ ] CSRF check on POST (Origin header)

---

## Known Limitations

- **API route tests are integration-level** — they depend on mocked YouTube API + Convex + Redis. Full integration tests deferred; current tests verify computation modules directly.
- **Convex ID as reportId** — Convex IDs are not user-guessable in practice but not cryptographically random. Migrate to nanoid publicId if enumeration becomes a concern.
- **No streaming** — 10-20s synchronous POST. Upgrade to SSE post-V1 if wait time is a problem.

---

## Next

After Plan 3A, proceed to **Plan 3B: Landing Page + Report UI** — form, loading overlay, report page, 12 section components, OG images, sharing.
