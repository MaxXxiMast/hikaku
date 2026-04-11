# Plan 2: Metrics Engine — YouTube API Client + Computation Modules

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the complete YouTube data fetching and metrics computation engine that powers all 12 report sections. Pure functions: data in, metrics out. No UI, no API routes, no side effects.

**Branch:** `feature/plan-2-metrics-engine` (from `master`)

**Spec:** `docs/specs/hikaku-v1-design.md` (Sections 7, 8)
**ADRs:** [004](../adrs/004-data-architecture-raw-plus-computed.md), [005](../adrs/005-api-key-strategy-hybrid.md), [014](../adrs/014-fat-raw-data-storage.md), [015](../adrs/015-channel-resolution-forhandle.md)
**Brainstorm:** `docs/brainstorm/2026-04-05-plan-2-brainstorm.md` (16 decisions)
**Reference scripts:** `docs/reference-scripts/` (WW vs FRA analysis — inspiration, not source code)
**Supersedes:** `docs/plans/2026-03-17-plan-2-metrics-engine.md` (pre-brainstorm draft)

**Core Principles (non-negotiable):**
- **KISS**: Each module does one thing. No god functions. No premature abstractions.
- **YAGNI**: Only compute what the 12 report sections need. No speculative metrics.
- **SOLID**: SRP per file. YouTube client doesn't compute. Metrics don't fetch. Types don't import implementations.
- **DRY**: Shared utility functions (formatNumber, percentile, median) in one place.
- **TDD**: Red → Green → Refactor for every feature. Tests define the contract.
- **ADD**: Not applicable for Plan 2 (no UI). Analytics added when modules are consumed in Plan 3.

**TDD format:** This plan includes test code, function signatures, and constraints. Implementations are discovered through TDD during execution — NOT pre-written in the plan.

**Note:** ADR-005 quota numbers (500 units/comparison, 20/day) are superseded by ADR-015 (~22 units, ~450/day).
**Note:** Zod v4.3.6 is installed (not v3). Use Zod 4 APIs — `z.coerce.number()` is confirmed compatible.
**Note:** The default `since` window (4 months) is not applied in this plan. It will be set in the API route (Plan 3). The `since` parameter is available in `fetchAllVideos` for Plan 3 to use.

---

## Setup

```bash
git checkout master && git pull
git checkout -b feature/plan-2-metrics-engine
pnpm test && pnpm build  # verify clean baseline
```

---

## File Map

### Created in this plan

```
src/
├── lib/
│   ├── youtube/
│   │   ├── types.ts            # Zod API response schemas + all TypeScript interfaces
│   │   ├── client.ts           # YouTube Data API v3 client (forHandle + time-windowed fetching)
│   │   ├── engagement.ts       # Engagement rate calculations
│   │   ├── categories.ts       # Video category classification from titles
│   │   ├── distribution.ts     # Statistical distribution (Gini, percentiles, viral)
│   │   ├── patterns.ts         # Posting patterns (frequency, day/hour, duration)
│   │   ├── titles.ts           # Title & SEO analysis
│   │   ├── growth.ts           # Growth trajectory + monthly aggregation
│   │   ├── summary.ts          # Executive summary generation (template-based)
│   │   ├── verdict.ts          # Head-to-head verdict (15-dimension scorecard)
│   │   └── metrics.ts          # Orchestrator �� runs all modules, returns ComputedReport
│   └── utils.ts                # Extended with shared math/formatting utilities
└── __tests__/
    └── lib/
        ├── utils.test.ts           # Math utility tests
        └── youtube/
            ├── types.test.ts       # Zod schema + type guard tests
            ├── client.test.ts      # YouTube client tests (mocked fetch)
            ├── engagement.test.ts  # Engagement computation tests
            ├── categories.test.ts  # Category classification tests
            ├── distribution.test.ts # Distribution metric tests
            ├── patterns.test.ts    # Posting pattern tests
            ├── titles.test.ts      # Title analysis tests
            ├── growth.test.ts      # Growth trajectory tests
            ├── summary.test.ts     # Summary generation tests
            ├── verdict.test.ts     # Verdict scoring tests
            ├── metrics.test.ts     # Orchestrator integration test
            └── fixtures.ts         # Shared test data (real WW vs FRA sample)
```

### Module Dependency Graph

```
types.ts (no imports — pure types + Zod schemas)
    ↑
    ├── client.ts (imports types, utils)
    ├── engagement.ts (imports types, utils)
    ├── categories.ts (imports types)
    ├── distribution.ts (imports types, utils)
    ├── patterns.ts (imports types, utils)
    ├── titles.ts (imports types)
    ├── growth.ts (imports types, utils)
    ├── summary.ts (imports types)
    ├── verdict.ts (imports types)
    └── metrics.ts (imports ALL modules — orchestrator)

Execution order in orchestrator:
  Phase 1 (independent): engagement, categories, distribution, patterns, titles, growth
  Phase 2 (depends on Phase 1): verdict, summary
  Inline: overview, subscriberEfficiency, contentFreshness
```

No circular dependencies. Types are the only shared import.

---

## Chunk 1: Types + Utilities + Test Fixtures

### Task 1.1: Define Zod API response schemas + all TypeScript interfaces

**Files:**
- Create: `src/lib/youtube/types.ts`
- Test: `src/__tests__/lib/youtube/types.test.ts`

- [x] **Step 1: Write tests**

Create `src/__tests__/lib/youtube/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import {
  YouTubeChannelResponseSchema,
  YouTubeVideoResponseSchema,
  YouTubePlaylistItemsResponseSchema,
} from "@/lib/youtube/types"
import type {
  RawVideo,
  RawChannel,
  ComputedReport,
  EngagementData,
  CategoryData,
  DistributionData,
  PostingPatternsData,
  TitleAnalysisData,
  GrowthData,
  VerdictData,
  ChannelOverviewData,
  SubscriberEfficiencyData,
  ContentFreshnessData,
  MonthlyData,
} from "@/lib/youtube/types"
// Inline API response samples (fixtures.ts doesn't exist yet at this task)
const validChannelResponse = {
  items: [{
    id: "UC123",
    snippet: {
      title: "Test Channel",
      publishedAt: "2020-01-01T00:00:00Z",
      customUrl: "@TestChannel",
      description: "A test channel",
      thumbnails: { default: { url: "https://yt3.ggpht.com/abc" } },
      country: "IN",
    },
    statistics: { subscriberCount: "1000", viewCount: "50000", videoCount: "100" },
    contentDetails: { relatedPlaylists: { uploads: "UU123" } },
    brandingSettings: { channel: { keywords: "test investing money" } },
    topicDetails: { topicCategories: ["https://en.wikipedia.org/wiki/Finance"] },
  }],
}

const validVideoResponse = {
  items: [{
    id: "v1",
    snippet: {
      title: "Test Video",
      publishedAt: "2024-01-15T18:00:00Z",
      description: "Test description",
      tags: ["test"],
      categoryId: "22",
      thumbnails: { default: { url: "https://i.ytimg.com/vi/v1/default.jpg" } },
    },
    statistics: { viewCount: "1000", likeCount: "50", commentCount: "10" },
    contentDetails: { duration: "PT5M30S", definition: "hd", caption: "false" },
    topicDetails: { topicCategories: [] },
  }],
}

const validPlaylistItemsResponse = {
  items: [{ contentDetails: { videoId: "v1" } }],
}

describe("Zod API response schemas", () => {
  it("parses a valid YouTube channel response", () => {
    const result = YouTubeChannelResponseSchema.safeParse(validChannelResponse)
    expect(result.success).toBe(true)
  })

  it("parses a valid YouTube video response", () => {
    const result = YouTubeVideoResponseSchema.safeParse(validVideoResponse)
    expect(result.success).toBe(true)
  })

  it("parses a valid YouTube playlist items response", () => {
    const result = YouTubePlaylistItemsResponseSchema.safeParse(validPlaylistItemsResponse)
    expect(result.success).toBe(true)
  })

  it("rejects a channel response with missing items", () => {
    const result = YouTubeChannelResponseSchema.safeParse({ noItems: true })
    expect(result.success).toBe(false)
  })

  it("rejects a video response with wrong types", () => {
    const result = YouTubeVideoResponseSchema.safeParse({
      items: [{ id: 123 }], // id should be string
    })
    expect(result.success).toBe(false)
  })
})

describe("TypeScript interfaces", () => {
  it("RawVideo interface has all core + extended fields", () => {
    const video: RawVideo = {
      id: "abc123",
      title: "Test Video",
      publishedAt: "2024-01-01T00:00:00Z",
      views: 1000,
      likes: 50,
      comments: 10,
      durationSec: 600,
      tags: ["test"],
      description: "A test video",
      categoryId: "22",
      channelId: "UC123",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123/default.jpg",
      topicCategories: [],
      definition: "hd",
      caption: false,
    }
    expect(video.id).toBe("abc123")
    expect(video.description).toBe("A test video")
  })

  it("RawChannel interface has all core + extended fields", () => {
    const channel: RawChannel = {
      id: "UC123",
      title: "Test Channel",
      handle: "@TestChannel",
      subscriberCount: 1000,
      totalViews: 50000,
      videoCount: 100,
      joinedDate: "2020-01-01T00:00:00Z",
      uploadsPlaylistId: "UU123",
      description: "A test channel",
      country: "IN",
      thumbnailUrl: "https://yt3.ggpht.com/abc",
      bannerUrl: "https://yt3.googleusercontent.com/banner",
      keywords: ["test"],
      topicCategories: [],
    }
    expect(channel.handle).toBe("@TestChannel")
    expect(channel.description).toBe("A test channel")
    expect(channel.country).toBe("IN")
  })

  it("ComputedReport has all 13 required sections", () => {
    const reportKeys: (keyof ComputedReport)[] = [
      "meta",
      "overview",
      "monthlyViewership",
      "engagement",
      "growth",
      "distribution",
      "postingPatterns",
      "titleAnalysis",
      "categories",
      "subscriberEfficiency",
      "contentFreshness",
      "verdict",
      "executiveSummary",
    ]
    expect(reportKeys).toHaveLength(13)
  })
})
```

- [x] **Step 2: Run test → verify FAIL**

```bash
pnpm test -- src/__tests__/lib/youtube/types.test.ts
```

Expected: FAIL — types module doesn't exist.

- [x] **Step 3: Implement types.ts**

**Signatures and constraints:**
- Export Zod schemas: `YouTubeChannelResponseSchema`, `YouTubeVideoResponseSchema`, `YouTubePlaylistItemsResponseSchema`
  - Schemas must match the full YouTube API v3 response shape (fat, per ADR-014)
  - Use `z.coerce.number()` for statistics fields (YouTube returns strings)
  - Use `.optional()` and `.default()` for fields that may be absent
- Export normalized interfaces: `RawVideo`, `RawChannel` — see spec Section 7.1-7.2 for all fields
  - `RawVideo`: include `defaultLanguage?: string` in addition to other extended fields
  - `RawChannel`: include `country?: string` and `bannerUrl?: string` in addition to other extended fields
  - Parse `brandingSettings.channel.keywords` (a space-separated string from YouTube) into `string[]` during Zod normalization via `.transform(s => s.split(" ").filter(Boolean))`
- Export computed types: `ChannelOverviewData`, `MonthlyData`, `EngagementData`, `CategoryData`, `DistributionData`, `PostingPatternsData`, `TitleAnalysisData`, `GrowthData`, `SubscriberEfficiencyData`, `ContentFreshnessData`, `VerdictDimension`, `VerdictData`, `ComputedReport` — see spec Section 7.3-7.3a
- Export `DURATION_BUCKETS` constant: `["0-30s", "30-60s", "1-2min", "2-5min", "5-10min", "10-20min", "20min+"]` — shared by engagement.ts and patterns.ts to avoid duplication
- **Zero implementation imports** — this file has only types, Zod schemas, and constants, no logic
- **Zod v4**: use Zod 4 APIs (v4.3.6 is installed). `z.coerce.number()` confirmed compatible.

- [x] **Step 4: Run test → verify PASS**

```bash
pnpm test -- src/__tests__/lib/youtube/types.test.ts
```

- [x] **Step 5: Commit**

```bash
git add src/lib/youtube/types.ts src/__tests__/lib/youtube/types.test.ts
git commit -m "feat: define Zod API response schemas and all TypeScript interfaces for YouTube data"
```

---

### Task 1.2: Add shared utility functions

**Files:**
- Modify: `src/lib/utils.ts` (keep existing `cn` function)
- Create: `src/__tests__/lib/utils.test.ts`

- [x] **Step 1: Write tests**

Create `src/__tests__/lib/utils.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import {
  formatNumber,
  median,
  percentile,
  computeGini,
  parseDuration,
  engagementRate,
  safeDivide,
} from "@/lib/utils"

describe("formatNumber", () => {
  it("formats millions", () => expect(formatNumber(1500000)).toBe("1.50M"))
  it("formats thousands", () => expect(formatNumber(45000)).toBe("45.0K"))
  it("formats small numbers", () => expect(formatNumber(999)).toBe("999"))
  it("handles zero", () => expect(formatNumber(0)).toBe("0"))
})

describe("median", () => {
  it("returns median of odd array", () => expect(median([1, 3, 5])).toBe(3))
  it("returns median of even array", () => expect(median([1, 2, 3, 4])).toBe(2.5))
  it("handles single element", () => expect(median([42])).toBe(42))
  it("handles empty array", () => expect(median([])).toBe(0))
  it("does not mutate input", () => {
    const arr = [5, 1, 3]
    median(arr)
    expect(arr).toEqual([5, 1, 3])
  })
})

describe("percentile", () => {
  it("returns p50", () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30)
  })
  it("returns p90", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(arr, 90)).toBe(91)
  })
  it("handles empty array", () => expect(percentile([], 50)).toBe(0))
})

describe("computeGini", () => {
  it("returns 0 for equal values", () => {
    expect(computeGini([100, 100, 100, 100])).toBeCloseTo(0, 1)
  })
  it("returns high value for unequal distribution", () => {
    expect(computeGini([1, 1, 1, 1000])).toBeGreaterThan(0.5)
  })
  it("handles empty array", () => expect(computeGini([])).toBe(0))
  it("handles single element", () => expect(computeGini([42])).toBe(0))
})

describe("parseDuration", () => {
  it("parses hours, minutes, seconds", () => {
    expect(parseDuration("PT1H2M3S")).toBe(3723)
  })
  it("parses minutes and seconds", () => {
    expect(parseDuration("PT5M30S")).toBe(330)
  })
  it("parses seconds only", () => {
    expect(parseDuration("PT45S")).toBe(45)
  })
  it("handles zero duration", () => {
    expect(parseDuration("PT0S")).toBe(0)
  })
  it("handles malformed input", () => {
    expect(parseDuration("invalid")).toBe(0)
  })
})

describe("engagementRate", () => {
  it("computes correct rate", () => {
    expect(engagementRate(50, 10, 1000)).toBeCloseTo(6.0)
  })
  it("handles zero views", () => {
    expect(engagementRate(10, 5, 0)).toBe(0)
  })
})

describe("safeDivide", () => {
  it("divides normally", () => expect(safeDivide(10, 2)).toBe(5))
  it("returns 0 for zero divisor", () => expect(safeDivide(10, 0)).toBe(0))
})
```

- [x] **Step 2: Run test → verify FAIL**
- [x] **Step 3: Implement utilities in `src/lib/utils.ts`**

**Signatures:**
```typescript
export const formatNumber = (n: number): string => { ... }
export const median = (arr: number[]): number => { ... }
export const percentile = (arr: number[], p: number): number => { ... }
export const computeGini = (values: number[]): number => { ... }
export const parseDuration = (iso8601: string): number => { ... }
export const engagementRate = (likes: number, comments: number, views: number): number => { ... }
export const safeDivide = (numerator: number, denominator: number): number => { ... }
```

**Constraints:**
- Keep existing `cn()` function at the top
- All functions are pure — no side effects, no external imports
- `median` must not mutate the input array
- `median` of even-length array returns average of two middle values
- `computeGini` formula: `sum((2i - n - 1) * value_i) / (n^2 * mean)` where values sorted ascending
- `parseDuration` parses ISO 8601 duration (`PT1H2M3S`) into seconds

- [x] **Step 4: Run test → verify PASS**
- [x] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/__tests__/lib/utils.test.ts
git commit -m "feat: add shared math/formatting utilities (formatNumber, median, percentile, Gini, parseDuration)"
```

---

### Task 1.3: Create test fixtures with real data

**Files:**
- Create: `src/__tests__/lib/youtube/fixtures.ts`

- [x] **Step 1: Create shared test fixture data**

Create `src/__tests__/lib/youtube/fixtures.ts` with:

**Sample channels** (from real WW vs FRA data):
```typescript
export const sampleChannelA: RawChannel = {
  id: "UCggPd3Vf9ooG2r4I_ZNWBzA",
  title: "Wint Wealth",
  handle: "@WintWealthYT",
  subscriberCount: 729000,
  totalViews: 108560000,
  videoCount: 239,
  joinedDate: "2021-03-21T00:00:00Z",
  uploadsPlaylistId: "UUggPd3Vf9ooG2r4I_ZNWBzA",
  description: "Making bonds and fixed income investing accessible",
  thumbnailUrl: "https://yt3.ggpht.com/ww-thumb",
  keywords: ["money", "investing", "passive income"],
  topicCategories: [],
  country: "IN",
}

export const sampleChannelB: RawChannel = {
  id: "UCPHv636tYhtARLzoINsGQVw",
  title: "Fixed Returns Academy by Grip Invest",
  handle: "@FixedReturnsAcademy",
  subscriberCount: 1300,
  totalViews: 121100,
  videoCount: 142,
  joinedDate: "2025-07-29T00:00:00Z",
  uploadsPlaylistId: "UUPHv636tYhtARLzoINsGQVw",
  description: "Learn everything about bonds and fixed income",
  thumbnailUrl: "https://yt3.ggpht.com/fra-thumb",
  keywords: ["bonds", "fixed income investing"],
  topicCategories: [],
  country: "IN",
}
```

**Sample videos** — minimum 5 per channel covering:
- Multiple months (for growth.ts monthly grouping)
- Different duration buckets (shorts, medium, long)
- Different categories (for categories.ts classification)
- Mix of high and low engagement (for engagement.ts)
- Question and non-question titles (for titles.ts)
- With tags (for title analysis top tags)

Use real data from WW vs FRA analysis. Include videos from `docs/reference-scripts/channel-comparison-report.md` as reference for realistic values.

**Explicit exports required** (referenced by all test files):
```typescript
export const sampleVideosA: RawVideo[] = [/* 5+ videos for WW */]
export const sampleVideosB: RawVideo[] = [/* 5+ videos for FRA */]
export const REFERENCE_DATE = new Date("2026-03-01T00:00:00Z")
```

**Sample YouTube API responses** (for Zod schema tests — must match full fat shape):

Build these by mirroring the Zod schemas from Task 1.1 with values from `sampleChannelA` and `sampleVideosA[0]`. Every field the Zod schema expects must be present. Use the inline API samples from `types.test.ts` (Task 1.1) as the structural template — those already have complete shapes for channel, video, and playlist responses.

```typescript
export const sampleYouTubeChannelResponse = {
  items: [{
    id: sampleChannelA.id,
    snippet: {
      title: sampleChannelA.title,
      publishedAt: sampleChannelA.joinedDate,
      customUrl: sampleChannelA.handle,
      description: sampleChannelA.description,
      thumbnails: { default: { url: sampleChannelA.thumbnailUrl } },
      country: sampleChannelA.country,
    },
    statistics: {
      subscriberCount: String(sampleChannelA.subscriberCount),
      viewCount: String(sampleChannelA.totalViews),
      videoCount: String(sampleChannelA.videoCount),
    },
    contentDetails: { relatedPlaylists: { uploads: sampleChannelA.uploadsPlaylistId } },
    brandingSettings: { channel: { keywords: sampleChannelA.keywords.join(" ") } },
    topicDetails: { topicCategories: sampleChannelA.topicCategories },
  }],
}
// sampleYouTubeVideoResponse and sampleYouTubePlaylistItemsResponse follow the same pattern
// using sampleVideosA[0] data. All fields from Zod schema must be present with string numbers.
```

**Constraints:**
- Use real channel IDs and realistic numbers
- Videos should span at least 3 different months
- Include at least one short (<60s), one medium (1-10min), one long (>10min) per channel
- API response fixtures must include ALL fat fields (description, categoryId, topicCategories, etc.)
- Export a `REFERENCE_DATE` constant for deterministic testing: `new Date("2026-03-01T00:00:00Z")`
- Export helper functions to avoid duplication in Chunk 4 tests:
  - `buildOverview(channels, videosByChannel)` — returns `ChannelOverviewData[]` (same logic orchestrator uses inline)
  - `buildContentFreshness(channels, videosByChannel, referenceDate)` — returns `ContentFreshnessData`
  - `buildSubscriberEfficiency(channels, videosByChannel)` — returns `SubscriberEfficiencyData`
  These are test helpers, not production code. They mirror the orchestrator's inline logic so verdict and summary tests don't duplicate 30+ lines each.

- [x] **Step 2: Commit**

```bash
git add src/__tests__/lib/youtube/fixtures.ts
git commit -m "feat: add test fixtures with real WW vs FRA sample data and API response samples"
```

---

## Chunk 2: YouTube API Client

### Task 2.1: Implement YouTube Data API v3 client

**Files:**
- Create: `src/lib/youtube/client.ts`
- Test: `src/__tests__/lib/youtube/client.test.ts`

- [x] **Step 1: Write tests**

Create `src/__tests__/lib/youtube/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("YouTube client", () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  describe("resolveChannel", () => {
    it("uses forHandle parameter on channels endpoint (not search)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "UC123",
            snippet: {
              title: "Test Channel",
              publishedAt: "2020-01-01T00:00:00Z",
              customUrl: "@TestChannel",
              description: "Test description",
              thumbnails: { default: { url: "https://thumb.jpg" } },
              country: "IN",
            },
            statistics: { subscriberCount: "1000", viewCount: "50000", videoCount: "100" },
            contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            brandingSettings: { channel: { keywords: "test keywords" } },
            topicDetails: { topicCategories: [] },
          }],
        }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      const channel = await resolveChannel("@TestChannel", "test-api-key")

      // Verify forHandle was used, NOT search
      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain("youtube/v3/channels")
      expect(calledUrl).toContain("forHandle")
      expect(calledUrl).not.toContain("youtube/v3/search")

      // Verify normalized result
      expect(channel.id).toBe("UC123")
      expect(channel.subscriberCount).toBe(1000)
      expect(channel.uploadsPlaylistId).toBe("UU123")
      expect(channel.description).toBe("Test description")
    })

    it("throws on channel not found (atomic fail)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await expect(resolveChannel("@NotReal", "key")).rejects.toThrow("Channel not found")
    })

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: "Quota exceeded" } }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await expect(resolveChannel("@Test", "key")).rejects.toThrow()
    })

    it("prepends @ if missing from handle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "UC123",
            snippet: { title: "T", publishedAt: "2020-01-01T00:00:00Z", customUrl: "@T", description: "", thumbnails: { default: { url: "" } } },
            statistics: { subscriberCount: "0", viewCount: "0", videoCount: "0" },
            contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            topicDetails: { topicCategories: [] },
          }],
        }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await resolveChannel("TestChannel", "key")

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain("forHandle=%40TestChannel")
    })
  })

  describe("fetchAllVideos", () => {
    it("fetches videos and normalizes through Zod", async () => {
      // Mock playlist items (1 page, no nextPageToken)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { contentDetails: { videoId: "v1" } },
            { contentDetails: { videoId: "v2" } },
          ],
        }),
      })
      // Mock video details
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: "v1",
              snippet: {
                title: "Video 1",
                publishedAt: "2024-01-15T18:00:00Z",
                description: "Desc 1",
                tags: ["test"],
                categoryId: "22",
                thumbnails: { default: { url: "https://thumb1.jpg" } },
              },
              statistics: { viewCount: "1000", likeCount: "50", commentCount: "10" },
              contentDetails: { duration: "PT5M30S", definition: "hd", caption: "false" },
              topicDetails: { topicCategories: [] },
            },
            {
              id: "v2",
              snippet: {
                title: "Video 2",
                publishedAt: "2024-02-01T14:00:00Z",
                description: "Desc 2",
                categoryId: "27",
                thumbnails: { default: { url: "https://thumb2.jpg" } },
              },
              statistics: { viewCount: "500", likeCount: "25", commentCount: "5" },
              contentDetails: { duration: "PT10M", definition: "hd", caption: "true" },
              topicDetails: { topicCategories: [] },
            },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "test-api-key")

      expect(videos).toHaveLength(2)
      expect(videos[0].title).toBe("Video 1")
      expect(videos[0].views).toBe(1000)
      expect(videos[0].durationSec).toBe(330)
      expect(videos[0].description).toBe("Desc 1")
      expect(videos[1].tags).toEqual([])  // Missing tags defaults to []
    })

    it("paginates through multiple pages", async () => {
      // Page 1 with nextPageToken
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: "v1" } }],
          nextPageToken: "PAGE2",
        }),
      })
      // Page 2 without nextPageToken
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: "v2" } }],
        }),
      })
      // Video details batch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: "v1", snippet: { title: "V1", publishedAt: "2024-01-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "100" }, contentDetails: { duration: "PT1M", definition: "hd" }, topicDetails: { topicCategories: [] } },
            { id: "v2", snippet: { title: "V2", publishedAt: "2024-02-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "200" }, contentDetails: { duration: "PT2M", definition: "hd" }, topicDetails: { topicCategories: [] } },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "key")
      expect(videos).toHaveLength(2)
    })

    it("respects since parameter — stops when video is older than cutoff", async () => {
      const since = new Date("2024-06-01T00:00:00Z")

      // Playlist page with videos spanning the cutoff
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { contentDetails: { videoId: "v1" } },  // will be recent
            { contentDetails: { videoId: "v2" } },  // will be old
          ],
        }),
      })
      // Video details — v1 is after cutoff, v2 is before
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: "v1", snippet: { title: "Recent", publishedAt: "2024-07-15T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "100" }, contentDetails: { duration: "PT1M", definition: "hd" }, topicDetails: { topicCategories: [] } },
            { id: "v2", snippet: { title: "Old", publishedAt: "2024-03-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "200" }, contentDetails: { duration: "PT2M", definition: "hd" }, topicDetails: { topicCategories: [] } },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "key", { since })

      expect(videos).toHaveLength(1)
      expect(videos[0].title).toBe("Recent")
    })
  })
})
```

- [x] **Step 2: Run test → verify FAIL**
- [x] **Step 3: Implement client.ts**

**Signatures:**
```typescript
export const resolveChannel = async (handle: string, apiKey: string): Promise<RawChannel>
export const fetchAllVideos = async (
  uploadsPlaylistId: string,
  apiKey: string,
  options?: { since?: Date }
): Promise<RawVideo[]>
```

**Constraints:**
- `resolveChannel` uses `channels?forHandle=` endpoint (1 unit), NOT search (per ADR-015)
- Prepend `@` to handle if missing
- Validate API responses through Zod schemas from types.ts
- Normalize YouTube string numbers to actual numbers via Zod coercion
- `fetchAllVideos` paginates through playlistItems in batches of 50
- When `since` is provided, filter out videos where `publishedAt < since` and stop pagination when a full page of videos is older than cutoff (optimization: playlist is sorted newest-first)
- Throw descriptive errors: `"Channel not found: @handle"`, `"YouTube API error (status): message"`
- This is the ONLY module that calls `fetch`

- [x] **Step 4: Run test → verify PASS**
- [x] **Step 5: Commit**

```bash
git add src/lib/youtube/client.ts src/__tests__/lib/youtube/client.test.ts
git commit -m "feat: implement YouTube API client with forHandle resolution and time-windowed fetching"
```

---

## Chunk 3: Phase-1 Computation Modules

All six modules depend only on `types.ts` and `utils.ts`. They can be implemented in any order or in parallel.

### Task 3.1: Engagement computation

**Files:**
- Create: `src/lib/youtube/engagement.ts`
- Test: `src/__tests__/lib/youtube/engagement.test.ts`

- [x] **Step 1: Write tests**

Create `src/__tests__/lib/youtube/engagement.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { computeEngagement } from "@/lib/youtube/engagement"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computeEngagement(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computeEngagement", () => {
  it("computes per-channel overall engagement rate", () => {
    expect(result.perChannel).toHaveLength(2)
    const chA = result.perChannel.find((c) => c.channelId === sampleChannelA.id)!
    expect(chA.overallRate).toBeGreaterThan(0)
    expect(chA.likeRate).toBeGreaterThan(0)
    expect(chA.commentRate).toBeGreaterThan(0)
    expect(chA.medianPerVideoRate).toBeGreaterThan(0)
  })

  it("computes monthly engagement trends", () => {
    expect(result.monthly.length).toBeGreaterThan(0)
    result.monthly.forEach((m) => {
      expect(m.engagementRate).toBeGreaterThanOrEqual(0)
      expect(m.month).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  it("computes engagement by duration bucket", () => {
    expect(result.byDuration.length).toBeGreaterThan(0)
    const validBuckets = ["0-30s", "30-60s", "1-2min", "2-5min", "5-10min", "10-20min", "20min+"]
    result.byDuration.forEach((d) => {
      expect(validBuckets).toContain(d.bucket)
    })
  })

  it("returns top engaged videos with min 500 views", () => {
    result.topEngaged.forEach((v) => {
      expect(v.views).toBeGreaterThanOrEqual(500)
      expect(v.engagementRate).toBeGreaterThan(0)
    })
  })

  it("handles empty video array", () => {
    const empty = computeEngagement(
      [sampleChannelA],
      { [sampleChannelA.id]: [] }
    )
    expect(empty.perChannel[0].overallRate).toBe(0)
    expect(empty.monthly).toHaveLength(0)
    expect(empty.byDuration).toHaveLength(0)
    expect(empty.topEngaged).toHaveLength(0)
  })

  it("handles videos with zero views without NaN", () => {
    const zeroView = [{ ...sampleVideosA[0], views: 0, likes: 0, comments: 0 }]
    const r = computeEngagement([sampleChannelA], { [sampleChannelA.id]: zeroView })
    expect(r.perChannel[0].overallRate).toBe(0)
    expect(Number.isNaN(r.perChannel[0].overallRate)).toBe(false)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computeEngagement = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): EngagementData
```

**Constraints:**
- Overall rate = `(totalLikes + totalComments) / totalViews * 100`
- Like rate and comment rate computed separately
- Median per-video rate: compute engagement per video, take median
- Monthly: group by YYYY-MM from `publishedAt`, compute rate per month
- Duration buckets: 7 buckets (0-30s, 30-60s, 1-2min, 2-5min, 5-10min, 10-20min, 20min+)
- Top engaged: top 5 per channel, minimum 500 views threshold
- Use `engagementRate` and `median` from utils.ts

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/engagement.ts src/__tests__/lib/youtube/engagement.test.ts
git commit -m "feat: implement engagement computation (overall, monthly, by duration, top engaged)"
```

---

### Task 3.2: Category classification

**Files:**
- Create: `src/lib/youtube/categories.ts`
- Test: `src/__tests__/lib/youtube/categories.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { classifyVideo, computeCategories } from "@/lib/youtube/categories"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

describe("classifyVideo", () => {
  it("classifies taxation videos", () => {
    expect(classifyVideo("How Are Bonds Taxed in India?")).toBe("Taxation")
  })
  it("classifies income strategy", () => {
    expect(classifyVideo("Build Monthly Passive Income with Bond Ladder")).toBe("Income Strategy")
  })
  it("classifies educational", () => {
    expect(classifyVideo("What Are Bonds? Beginner's Guide")).toBe("Educational")
  })
  it("classifies myths/mistakes", () => {
    expect(classifyVideo("5 Mistakes Every Bond Investor Makes")).toBe("Myths/Mistakes")
  })
  it("classifies comparison", () => {
    expect(classifyVideo("FD vs Bonds: Which is Better?")).toBe("Comparison")
  })
  it("classifies shorts", () => {
    expect(classifyVideo("Bond Basics #shorts")).toBe("Shorts")
  })
  it("falls back to Other", () => {
    expect(classifyVideo("Random Unrelated Title")).toBe("Other")
  })
  it("is case-insensitive", () => {
    expect(classifyVideo("TAX SAVING TIPS")).toBe("Taxation")
  })
})

describe("computeCategories", () => {
  const result = computeCategories(
    [sampleChannelA, sampleChannelB],
    { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
  )

  it("returns CategoryData[] with per-category stats", () => {
    expect(result.length).toBeGreaterThan(0)
    result.forEach((cat) => {
      expect(cat.name).toBeTruthy()
      expect(cat.videoCount).toBeGreaterThan(0)
      expect(cat.avgViews).toBeGreaterThanOrEqual(0)
    })
  })

  it("includes topVideo per category", () => {
    result.forEach((cat) => {
      expect(cat.topVideo.title).toBeTruthy()
      expect(cat.topVideo.views).toBeGreaterThanOrEqual(0)
    })
  })

  it("handles empty video array", () => {
    const empty = computeCategories([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty).toHaveLength(0)
  })

  it("classifies all as Other when no keywords match", () => {
    const generic = [{ ...sampleVideosA[0], title: "Random Thoughts on Life" }]
    const r = computeCategories([sampleChannelA], { [sampleChannelA.id]: generic })
    expect(r.every((c) => c.name === "Other")).toBe(true)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signatures:**
```typescript
export const classifyVideo = (title: string): string
export const computeCategories = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): CategoryData[]
```

**Constraints:**
- Keyword table from spec Section 8.1 (12 finance categories + "Other")
- Case-insensitive matching
- `computeCategories` groups by category per channel, computes videoCount, totalViews, avgViews, engagementRate, topVideo
- Finance-only for V1 (brainstorm decision #1)

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/categories.ts src/__tests__/lib/youtube/categories.test.ts
git commit -m "feat: implement category classification (finance keyword-based, V1 scope)"
```

---

### Task 3.3: Distribution & virality

**Files:**
- Create: `src/lib/youtube/distribution.ts`
- Test: `src/__tests__/lib/youtube/distribution.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { computeDistribution } from "@/lib/youtube/distribution"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computeDistribution(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computeDistribution", () => {
  it("computes Gini coefficient between 0 and 1", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.gini).toBeGreaterThanOrEqual(0)
      expect(ch.gini).toBeLessThanOrEqual(1)
    })
  })

  it("WW should have higher Gini than FRA (more hit-driven)", () => {
    const wwGini = result.perChannel.find((c) => c.channelId === sampleChannelA.id)!.gini
    const fraGini = result.perChannel.find((c) => c.channelId === sampleChannelB.id)!.gini
    expect(wwGini).toBeGreaterThan(fraGini)
  })

  it("computes correct percentiles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.percentiles.p10).toBeLessThanOrEqual(ch.percentiles.p25)
      expect(ch.percentiles.p25).toBeLessThanOrEqual(ch.percentiles.p50)
      expect(ch.percentiles.p50).toBeLessThanOrEqual(ch.percentiles.p75)
      expect(ch.percentiles.p75).toBeLessThanOrEqual(ch.percentiles.p90)
    })
  })

  it("computes viral thresholds", () => {
    result.viralThresholds.forEach((vt) => {
      expect(vt.gte1k.pct).toBeGreaterThanOrEqual(0)
      expect(vt.gte1k.pct).toBeLessThanOrEqual(100)
      // Higher thresholds should have lower or equal percentages
      expect(vt.gte1m.pct).toBeLessThanOrEqual(vt.gte100k.pct)
    })
  })

  it("handles empty video array", () => {
    const empty = computeDistribution([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty.perChannel[0].gini).toBe(0)
    expect(empty.perChannel[0].mean).toBe(0)
  })

  it("returns Gini 0 for single video", () => {
    const single = computeDistribution([sampleChannelA], { [sampleChannelA.id]: [sampleVideosA[0]] })
    expect(single.perChannel[0].gini).toBe(0)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computeDistribution = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): DistributionData
```

**Constraints:**
- Use `computeGini`, `median`, `percentile` from utils.ts
- `meanMedianRatio` = mean / median (>1 = hit-driven, ~1 = consistent)
- `top10PctShare` = % of total views from top 10% of videos
- Viral thresholds: gte1k, gte10k, gte100k, gte1m — count, total videos, percentage

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/distribution.ts src/__tests__/lib/youtube/distribution.test.ts
git commit -m "feat: implement distribution & virality metrics (Gini, percentiles, viral thresholds)"
```

---

### Task 3.4: Posting patterns

**Files:**
- Create: `src/lib/youtube/patterns.ts`
- Test: `src/__tests__/lib/youtube/patterns.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { computePostingPatterns } from "@/lib/youtube/patterns"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computePostingPatterns(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computePostingPatterns", () => {
  it("computes upload frequency per channel", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.avgUploadsPerMonth).toBeGreaterThan(0)
      expect(ch.avgGapDays).toBeGreaterThan(0)
    })
  })

  it("computes day-of-week distribution with 7 days", () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const channelDays = result.dayOfWeek.filter((d) => d.channelId === sampleChannelA.id)
    const dayNames = channelDays.map((d) => d.day)
    days.forEach((day) => expect(dayNames).toContain(day))
  })

  it("computes hour-of-day distribution with 24 slots", () => {
    const channelHours = result.hourOfDay.filter((h) => h.channelId === sampleChannelA.id)
    expect(channelHours.length).toBeLessThanOrEqual(24)
    channelHours.forEach((h) => {
      expect(Number(h.hour)).toBeGreaterThanOrEqual(0)
      expect(Number(h.hour)).toBeLessThanOrEqual(23)
    })
  })

  it("assigns duration buckets correctly", () => {
    const validBuckets = ["0-30s", "30-60s", "1-2min", "2-5min", "5-10min", "10-20min", "20min+"]
    result.durationBuckets.forEach((d) => {
      expect(validBuckets).toContain(d.bucket)
    })
  })

  it("handles single video", () => {
    const single = computePostingPatterns(
      [sampleChannelA],
      { [sampleChannelA.id]: [sampleVideosA[0]] }
    )
    expect(single.perChannel[0].avgUploadsPerMonth).toBeGreaterThan(0)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computePostingPatterns = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): PostingPatternsData
```

**Constraints:**
- Upload frequency: count videos per month, compute average. Gap = days between consecutive uploads (sorted by publishedAt).
- Day of week: extract from `publishedAt` Date. Return all 7 days even if 0 videos.
- Hour of day: extract UTC hour from `publishedAt`. Only include hours that have videos.
- Duration buckets: same 7 buckets as engagement module

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/patterns.ts src/__tests__/lib/youtube/patterns.test.ts
git commit -m "feat: implement posting patterns (upload frequency, day/hour performance, duration)"
```

---

### Task 3.5: Title & SEO analysis

**Files:**
- Create: `src/lib/youtube/titles.ts`
- Test: `src/__tests__/lib/youtube/titles.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { computeTitleAnalysis } from "@/lib/youtube/titles"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computeTitleAnalysis(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computeTitleAnalysis", () => {
  it("detects question titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.questionPct).toBeGreaterThanOrEqual(0)
      expect(ch.questionPct).toBeLessThanOrEqual(100)
    })
  })

  it("detects emoji in titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.emojiPct).toBeGreaterThanOrEqual(0)
      expect(ch.emojiPct).toBeLessThanOrEqual(100)
    })
  })

  it("detects numbers/currency in titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.numberPct).toBeGreaterThanOrEqual(0)
    })
  })

  it("computes average title length", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.avgTitleLength).toBeGreaterThan(0)
    })
  })

  it("returns top tags sorted by frequency", () => {
    result.topTags.forEach((t) => {
      expect(t.tags.length).toBeLessThanOrEqual(15)
      // Tags should be sorted descending by count
      for (let i = 1; i < t.tags.length; i++) {
        expect(t.tags[i].count).toBeLessThanOrEqual(t.tags[i - 1].count)
      }
    })
  })

  it("handles empty video array", () => {
    const empty = computeTitleAnalysis([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty.perChannel[0].avgTitleLength).toBe(0)
    expect(empty.perChannel[0].questionPct).toBe(0)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computeTitleAnalysis = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): TitleAnalysisData
```

**Constraints:**
- Question detection: title contains `?`
- Emoji detection: use Unicode property escape `/\p{Emoji}/u` (check browser/Node support — may need a simpler regex)
- Number/currency detection: `/\d/` or `₹` in title
- Average views computed separately for videos with and without each pattern
- Top 15 tags per channel from video `tags[]` arrays, merged and counted, sorted descending

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/titles.ts src/__tests__/lib/youtube/titles.test.ts
git commit -m "feat: implement title & SEO analysis (question, emoji, number detection, top tags)"
```

---

### Task 3.6: Growth trajectory

**Files:**
- Create: `src/lib/youtube/growth.ts`
- Test: `src/__tests__/lib/youtube/growth.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { computeGrowth } from "@/lib/youtube/growth"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB, REFERENCE_DATE } from "./fixtures"

const result = computeGrowth(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB },
  REFERENCE_DATE
)

describe("computeGrowth", () => {
  it("groups videos by YYYY-MM", () => {
    result.monthlyComparison.forEach((m) => {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/)
      expect(m.videoCount).toBeGreaterThan(0)
    })
  })

  it("computes MoM change (null for first month)", () => {
    const chAMonths = result.monthlyComparison
      .filter((m) => m.channelId === sampleChannelA.id)
      .sort((a, b) => a.month.localeCompare(b.month))

    if (chAMonths.length > 0) {
      expect(chAMonths[0].momChange).toBeNull()
    }
    if (chAMonths.length > 1) {
      expect(chAMonths[1].momChange).not.toBeNull()
    }
  })

  it("detects lifecycle phases", () => {
    result.lifecyclePhases.forEach((ch) => {
      expect(ch.phases.length).toBeGreaterThan(0)
      ch.phases.forEach((phase) => {
        expect(phase.name).toBeTruthy()
        expect(phase.period).toBeTruthy()
        expect(phase.avgMonthlyViews).toBeGreaterThanOrEqual(0)
      })
    })
  })

  it("is deterministic with referenceDate", () => {
    const result2 = computeGrowth(
      [sampleChannelA, sampleChannelB],
      { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB },
      REFERENCE_DATE
    )
    expect(result2).toEqual(result)
  })

  it("handles single month of data", () => {
    const singleMonth = computeGrowth(
      [sampleChannelA],
      { [sampleChannelA.id]: [sampleVideosA[0]] },
      REFERENCE_DATE
    )
    const months = singleMonth.monthlyComparison.filter((m) => m.channelId === sampleChannelA.id)
    expect(months).toHaveLength(1)
    expect(months[0].momChange).toBeNull()
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computeGrowth = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>,
  referenceDate: Date
): GrowthData
```

**Constraints:**
- Returns `{ monthlyComparison, lifecyclePhases }` — serves both Report Section 3 and Section 5 (brainstorm decision #11)
- Monthly aggregation: group by YYYY-MM, compute videoCount, totalViews, avgViewsPerVideo, totalLikes, totalComments, momChange
- MoM change = `(current - previous) / previous * 100`, null for first month
- Lifecycle phases: split timeline into segments (e.g., thirds or inflection-point based), label each (Launch/Growth/Peak/Decline/Plateau) based on MoM trend within segment
- `referenceDate` parameter for deterministic output (brainstorm decision #12) — use for any "relative to now" computation
- No `new Date()` calls inside the function

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/growth.ts src/__tests__/lib/youtube/growth.test.ts
git commit -m "feat: implement growth trajectory (monthly aggregation, MoM change, lifecycle phases)"
```

---

## Chunk 4: Phase-2 Computation Modules

**BLOCKING**: All 6 Chunk 3 tasks (3.1–3.6) must be complete and passing before Chunk 4 can start. Verdict and summary tests import and execute Chunk 3 modules at the top level — if any Chunk 3 module is missing or broken, these tests will fail at collection time with opaque "Failed to collect" errors. If this happens, verify all Chunk 3 modules pass independently first, then check fixture data compatibility.

### Task 4.1: Head-to-head verdict

**Files:**
- Create: `src/lib/youtube/verdict.ts`
- Test: `src/__tests__/lib/youtube/verdict.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { computeVerdict } from "@/lib/youtube/verdict"
import { computeEngagement } from "@/lib/youtube/engagement"
import { computeCategories } from "@/lib/youtube/categories"
import { computeDistribution } from "@/lib/youtube/distribution"
import { computePostingPatterns } from "@/lib/youtube/patterns"
import { computeTitleAnalysis } from "@/lib/youtube/titles"
import { computeGrowth } from "@/lib/youtube/growth"
import type { SubscriberEfficiencyData, ContentFreshnessData } from "@/lib/youtube/types"
import {
  sampleChannelA, sampleChannelB,
  sampleVideosA, sampleVideosB,
  REFERENCE_DATE,
  buildOverview,
  buildContentFreshness,
  buildSubscriberEfficiency,
} from "./fixtures"

// Compute real inputs from fixture data using actual modules + fixture helpers.
// Overview, subscriberEfficiency, contentFreshness use fixture helpers
// (mirrors orchestrator inline logic, per brainstorm decision #3).
const channels = [sampleChannelA, sampleChannelB]
const videosByChannel = { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }

const overview = buildOverview(channels, videosByChannel)
const engagement = computeEngagement(channels, videosByChannel)
const categories = computeCategories(channels, videosByChannel)
const distribution = computeDistribution(channels, videosByChannel)
const postingPatterns = computePostingPatterns(channels, videosByChannel)
const titleAnalysis = computeTitleAnalysis(channels, videosByChannel)
const growth = computeGrowth(channels, videosByChannel, REFERENCE_DATE)
const subscriberEfficiency = buildSubscriberEfficiency(channels, videosByChannel)
const contentFreshness = buildContentFreshness(channels, videosByChannel, REFERENCE_DATE)

const result = computeVerdict(
  channels, overview, engagement, growth, distribution,
  postingPatterns, titleAnalysis, categories, subscriberEfficiency, contentFreshness
)

describe("computeVerdict", () => {
  it("returns exactly 15 dimensions", () => {
    expect(result.dimensions).toHaveLength(15)
  })

  it("includes all named dimensions from WW vs FRA report", () => {
    const names = result.dimensions.map((d) => d.dimension)
    expect(names).toContain("Scale & Reach")
    expect(names).toContain("Engagement Quality")
    expect(names).toContain("Content-Product Fit")
    expect(names).toContain("Growth Trajectory")
    expect(names).toContain("Upload Strategy")
    expect(names).toContain("SEO / Discoverability")
    expect(names).toContain("Subscriber Efficiency")
    expect(names).toContain("Duration Strategy")
    expect(names).toContain("Title Optimization")
    expect(names).toContain("Posting Optimization")
    expect(names).toContain("Content Freshness")
    expect(names).toContain("Brand Building")
    expect(names).toContain("Viral Potential")
    expect(names).toContain("Audience Depth")
    expect(names).toContain("Long-term Defensibility")
  })

  it("WW wins Scale & Reach (108M vs 121K — massive difference)", () => {
    const scaleDimension = result.dimensions.find((d) => d.dimension === "Scale & Reach")!
    expect(scaleDimension.winnerId).toBe(sampleChannelA.id)
    expect(scaleDimension.margin).toBe("Strong")
  })

  it("produces ties when difference < 5%", () => {
    // Test with synthetic data that guarantees a tie
    const tieChannels = [
      { ...sampleChannelA, id: "tie-a", totalViews: 1000000, subscriberCount: 10000 },
      { ...sampleChannelB, id: "tie-b", totalViews: 1020000, subscriberCount: 10100 }, // ~2% difference
    ]
    const tieVideos = {
      "tie-a": sampleVideosA.map((v) => ({ ...v, views: 1000, likes: 20, comments: 2 })),
      "tie-b": sampleVideosB.map((v) => ({ ...v, views: 1010, likes: 21, comments: 2 })), // ~1% difference
    }
    const tieEngagement = computeEngagement(tieChannels, tieVideos)
    const tieCategories = computeCategories(tieChannels, tieVideos)
    const tieDistribution = computeDistribution(tieChannels, tieVideos)
    const tiePatterns = computePostingPatterns(tieChannels, tieVideos)
    const tieTitles = computeTitleAnalysis(tieChannels, tieVideos)
    const tieGrowth = computeGrowth(tieChannels, tieVideos, REFERENCE_DATE)
    const tieOverview = tieChannels.map((ch) => ({
      channel: ch,
      avgViewsPerVideo: 1000,
      topVideo: { title: "T", views: 1000 },
      viewsPerSub: 100,
      viewsPerSubPerVideo: 0.1,
    }))
    const tieSubEff: SubscriberEfficiencyData = {
      perChannel: tieChannels.map((ch) => ({ channelId: ch.id, viewsPerSub: 100, viewsPerSubPerVideo: 0.1 })),
    }
    const tieFreshness: ContentFreshnessData = {
      perChannel: tieChannels.map((ch) => ({ channelId: ch.id, recentCount: 5, recentAvgViews: 1000, allTimeAvgViews: 1000, deltaPercent: 0 })),
    }
    const tieResult = computeVerdict(
      tieChannels, tieOverview, tieEngagement, tieGrowth, tieDistribution,
      tiePatterns, tieTitles, tieCategories, tieSubEff, tieFreshness
    )
    // With nearly identical data, most dimensions should be ties
    const tieCount = tieResult.dimensions.filter((d) => d.winnerId === null).length
    expect(tieCount).toBeGreaterThan(5) // majority should be ties
  })

  it("generates a non-empty summary string", () => {
    expect(result.summary).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(20)
  })

  it("classifies margin as Slight, Moderate, or Strong", () => {
    result.dimensions.forEach((d) => {
      if (d.winnerId !== null) {
        expect(["Slight", "Moderate", "Strong"]).toContain(d.margin)
      }
    })
  })

  it("all ties have null winnerId and empty margin", () => {
    result.dimensions.forEach((d) => {
      if (d.winnerId === null) {
        expect(d.margin).toBe("")
      }
    })
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const computeVerdict = (
  channels: RawChannel[],
  overview: ChannelOverviewData[],
  engagement: EngagementData,
  growth: GrowthData,
  distribution: DistributionData,
  postingPatterns: PostingPatternsData,
  titleAnalysis: TitleAnalysisData,
  categories: CategoryData[],
  subscriberEfficiency: SubscriberEfficiencyData,
  contentFreshness: ContentFreshnessData
): VerdictData
```

**Constraints:**
- 15 dimensions matching WW vs FRA report (brainstorm decisions #5, #15)
- Scoring: extract metric(s) per dimension, compare across channels
- Ties: difference < 5% → `winnerId: null`, margin = "" (brainstorm decision #13)
- Margin: Slight (<15% diff), Moderate (15-50%), Strong (>50%)
- Notes: brief explanation of why the winner won
- Summary: one-paragraph overview of the verdict
- Now receives `categories` (for Content-Product Fit, Long-term Defensibility) and `subscriberEfficiency` (for Subscriber Efficiency dimension)
- See spec Section 8.6 for dimension → data source mapping

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/verdict.ts src/__tests__/lib/youtube/verdict.test.ts
git commit -m "feat: implement head-to-head verdict (15 dimensions, threshold-based ties)"
```

---

### Task 4.2: Executive summary generation

**Files:**
- Create: `src/lib/youtube/summary.ts`
- Test: `src/__tests__/lib/youtube/summary.test.ts`

- [x] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { generateSummary } from "@/lib/youtube/summary"
import { computeEngagement } from "@/lib/youtube/engagement"
import { computeDistribution } from "@/lib/youtube/distribution"
import { computeGrowth } from "@/lib/youtube/growth"
import {
  sampleChannelA, sampleChannelB,
  sampleVideosA, sampleVideosB,
  REFERENCE_DATE,
  buildOverview,
  buildContentFreshness,
} from "./fixtures"

// Compute real inputs using actual modules + fixture helpers
const channels = [sampleChannelA, sampleChannelB]
const videosByChannel = { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }

const overview = buildOverview(channels, videosByChannel)
const engagement = computeEngagement(channels, videosByChannel)
const distribution = computeDistribution(channels, videosByChannel)
const growth = computeGrowth(channels, videosByChannel, REFERENCE_DATE)
const contentFreshness = buildContentFreshness(channels, videosByChannel, REFERENCE_DATE)

const summary = generateSummary(channels, overview, engagement, growth, distribution, contentFreshness)

describe("generateSummary", () => {
  it("returns a non-empty string", () => {
    expect(summary).toBeTruthy()
    expect(summary.length).toBeGreaterThan(50)
  })

  it("mentions channel names", () => {
    expect(summary).toContain(sampleChannelA.title)
    expect(summary).toContain(sampleChannelB.title)
  })

  it("references key metrics", () => {
    const hasMetric = /engagement|views|growth|decline|viral|subscriber/i.test(summary)
    expect(hasMetric).toBe(true)
  })
})
```

- [x] **Step 2: Run test → FAIL, implement, run test → PASS**

**Signature:**
```typescript
export const generateSummary = (
  channels: RawChannel[],
  overview: ChannelOverviewData[],
  engagement: EngagementData,
  growth: GrowthData,
  distribution: DistributionData,
  contentFreshness: ContentFreshnessData
): string
```

**Constraints:**
- Template-based for V1 (brainstorm FS-5 defers LLM to post-V1)
- Template: `"[Channel A] dominates on [top metric] ([value]) but [Channel B] wins on [strength] ([value]). [Trend observation]. [Key insight]."`
- Now receives overview (for scale references) and growth (for trend observations)
- Identify top metric per channel from the inputs
- Reference engagement rates, distribution shape, freshness trends, scale
- Handle 2-4 channels (not just 2)

- [x] **Step 3: Commit**

```bash
git add src/lib/youtube/summary.ts src/__tests__/lib/youtube/summary.test.ts
git commit -m "feat: implement template-based executive summary generation"
```

---

## Chunk 5: Orchestrator + Integration

### Task 5.1: Metrics orchestrator

**Files:**
- Create: `src/lib/youtube/metrics.ts`
- Test: `src/__tests__/lib/youtube/metrics.test.ts`

- [x] **Step 1: Write integration test**

```typescript
import { describe, it, expect } from "vitest"
import { computeReport } from "@/lib/youtube/metrics"
import {
  sampleChannelA, sampleChannelB,
  sampleVideosA, sampleVideosB,
  REFERENCE_DATE,
} from "./fixtures"

const channels = [sampleChannelA, sampleChannelB]
const videosByChannel = {
  [sampleChannelA.id]: sampleVideosA,
  [sampleChannelB.id]: sampleVideosB,
}

const report = computeReport(channels, videosByChannel, { referenceDate: REFERENCE_DATE })

describe("computeReport", () => {
  it("returns a complete ComputedReport with all 13 sections", () => {
    expect(report.meta).toBeDefined()
    expect(report.overview).toBeDefined()
    expect(report.monthlyViewership).toBeDefined()
    expect(report.engagement).toBeDefined()
    expect(report.growth).toBeDefined()
    expect(report.distribution).toBeDefined()
    expect(report.postingPatterns).toBeDefined()
    expect(report.titleAnalysis).toBeDefined()
    expect(report.categories).toBeDefined()
    expect(report.subscriberEfficiency).toBeDefined()
    expect(report.contentFreshness).toBeDefined()
    expect(report.verdict).toBeDefined()
    expect(report.executiveSummary).toBeDefined()
  })

  it("meta contains channel handles and generation timestamp", () => {
    expect(report.meta.channelHandles).toEqual(["@WintWealthYT", "@FixedReturnsAcademy"])
    expect(report.meta.generatedAt).toBeTruthy()
  })

  it("overview has correct per-channel data", () => {
    expect(report.overview).toHaveLength(2)
    report.overview.forEach((o) => {
      expect(o.channel).toBeDefined()
      expect(o.avgViewsPerVideo).toBeGreaterThanOrEqual(0)
      expect(o.topVideo.title).toBeTruthy()
    })
  })

  it("subscriberEfficiency computed inline", () => {
    expect(report.subscriberEfficiency.perChannel).toHaveLength(2)
    report.subscriberEfficiency.perChannel.forEach((ch) => {
      expect(ch.viewsPerSub).toBeGreaterThanOrEqual(0)
      expect(ch.viewsPerSubPerVideo).toBeGreaterThanOrEqual(0)
    })
  })

  it("contentFreshness computed inline using referenceDate", () => {
    expect(report.contentFreshness.perChannel).toHaveLength(2)
    report.contentFreshness.perChannel.forEach((ch) => {
      expect(ch.allTimeAvgViews).toBeGreaterThanOrEqual(0)
    })
  })

  it("verdict has 15 dimensions", () => {
    expect(report.verdict.dimensions).toHaveLength(15)
  })

  it("executiveSummary is non-empty", () => {
    expect(report.executiveSummary.length).toBeGreaterThan(50)
  })

  it("is deterministic with same referenceDate", () => {
    const report2 = computeReport(channels, videosByChannel, { referenceDate: REFERENCE_DATE })
    expect(report2.meta.generatedAt).toBe(report.meta.generatedAt)
    expect(report2.verdict.dimensions).toEqual(report.verdict.dimensions)
    expect(report2.executiveSummary).toBe(report.executiveSummary)
  })

  it("handles channel with zero videos without crashing", () => {
    const emptyReport = computeReport(
      [sampleChannelA],
      { [sampleChannelA.id]: [] },
      { referenceDate: REFERENCE_DATE }
    )
    expect(emptyReport.overview).toHaveLength(1)
    expect(emptyReport.overview[0].avgViewsPerVideo).toBe(0)
    expect(emptyReport.engagement.perChannel[0].overallRate).toBe(0)
  })
})
```

- [x] **Step 2: Run test → FAIL**
- [x] **Step 3: Implement orchestrator**

**Signature:**
```typescript
export const computeReport = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>,
  options?: { referenceDate?: Date }
): ComputedReport
```

**Constraints:**
- Three-phase execution inside orchestrator:
  - **Inline first**: Compute `overview`, `subscriberEfficiency`, `contentFreshness` — these are needed by Phase 2 modules
  - **Phase 1** (independent, after inline): `computeEngagement`, `computeCategories`, `computeDistribution`, `computePostingPatterns`, `computeTitleAnalysis`, `computeGrowth`
  - **Phase 2** (depends on inline + Phase 1): `computeVerdict` (receives overview, engagement, growth, distribution, postingPatterns, titleAnalysis, categories, subscriberEfficiency, contentFreshness), `generateSummary` (receives overview, engagement, growth, distribution, contentFreshness)
- Inline computations (no separate module — computed before Phase 1 and Phase 2):
  - `overview`: avgViewsPerVideo, topVideo, viewsPerSub, viewsPerSubPerVideo
  - `subscriberEfficiency`: viewsPerSub, viewsPerSubPerVideo
  - `contentFreshness`: recent (30 days from referenceDate) vs all-time avg views, delta %
- `referenceDate` defaults to `new Date()` only at the top of this function — passed to growth and used for contentFreshness
- `meta.generatedAt` uses referenceDate ISO string
- `monthlyViewership` is set to `growth.monthlyComparison` — this explicit mapping connects Report Section 3 to the growth module output
- `computeVerdict` now receives `categories` and `subscriberEfficiency` in addition to other Phase 1 outputs
- `generateSummary` now receives `overview` and `growth` in addition to engagement, distribution, contentFreshness
- No `new Date()` anywhere except the default for referenceDate

- [x] **Step 4: Run test → verify PASS**
- [x] **Step 5: Commit**

```bash
git add src/lib/youtube/metrics.ts src/__tests__/lib/youtube/metrics.test.ts
git commit -m "feat: implement metrics orchestrator — assembles full ComputedReport from all modules"
```

---

## Chunk 6: Final Verification

### Task 6.1: Run full test suite

- [x] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (40+ tests across types, utils, client, 8 computation modules, orchestrator).

- [x] **Step 2: Type check**

```bash
pnpm exec tsc --noEmit
```

Expected: No TypeScript errors.

- [x] **Step 3: Build**

```bash
pnpm build
```

Expected: Build succeeds.

- [x] **Step 4: Commit any remaining changes and push**

```bash
git push -u origin feature/plan-2-metrics-engine
```

---

## Verification Checklist

- [x] All tests pass (`pnpm test`)
- [x] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [x] `pnpm build` succeeds
- [x] Every computation module is a pure function (no side effects, no fetch calls, no Date.now)
- [x] Every module has independent tests using shared fixtures + inline edge cases
- [x] Types file has zero implementation imports (pure interfaces + Zod schemas)
- [x] Metrics orchestrator produces a complete ComputedReport with all 13 sections
- [x] Verdict has exactly 15 dimensions
- [x] `referenceDate` produces deterministic output
- [x] `forHandle` used for channel resolution (not Search API)
- [x] Zod validates YouTube API responses at the client boundary
- [x] `since` parameter controls time-windowed video fetching

## Known Limitations (address in future plans)

- **2-channel testing only**: All tests use 2 channels. 3-4 channel support (spec says 2-4) is untested. Verdict scoring with >2 channels (pairwise vs multi-way winner selection) may need adjustment. Add 3-4 channel tests when UI supports channel count selection (Plan 3).
- **Range-only assertions**: Some tests assert `> 0` or `>= 0` instead of fixture-specific expected values. These pass even with broken formulas. Tighten assertions as fixture data stabilizes.
- **Atomic fail enforcement**: `resolveChannel` throws on missing channels, but the "all must resolve or none proceed" guarantee is the API route's responsibility (Plan 3), not the computation layer's.

---

## Next Plan

After Plan 2 is complete, proceed to **Plan 3: Pages + Report UI** — landing page form, `/api/compare` route, comparison page with phased reveal, and all 12 report section components.
