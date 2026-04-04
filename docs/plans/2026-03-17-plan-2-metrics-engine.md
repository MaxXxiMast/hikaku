# Plan 2: Metrics Engine — YouTube API Client + Computation Modules

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete YouTube data fetching and metrics computation engine that powers all 12 report sections. This is the computational core of Hikaku — ported from the proven analysis scripts used for the WW vs FRA comparison.

**Architecture:** A YouTube API client fetches channel + video data, then a pipeline of pure computation modules transforms raw data into report-ready metrics. Each module is independently testable with no side effects.

**Tech Stack:** TypeScript, Zod (API response validation), YouTube Data API v3

**Spec:** `docs/specs/2026-03-16-hikaku-v1-design.md` (Sections 7, 8)
**ADRs:** `docs/adrs/004` (data architecture), `docs/adrs/011` (Convex backend)
**Source scripts:** `gi-client-web` repo, branch `analysis/youtube-channel-comparison`, files: `youtube-channel-stats.mjs`, `youtube-video-breakdown.mjs`, `engagement-comparison.mjs`, `deep-inference.mjs`

**Core Principles (non-negotiable):**
- **KISS**: Each module does one thing. No god functions. No premature abstractions.
- **YAGNI**: Only compute what the 12 report sections need. No speculative metrics.
- **SOLID**: SRP per file. YouTube client doesn't compute. Metrics don't fetch. Types don't import implementations.
- **DRY**: Shared utility functions (formatNumber, percentile, median) in one place.
- **TDD**: Every computation function tested with real-world data from the WW vs FRA analysis.
- **ADD**: Not applicable for Plan 2 (no UI, no user-facing events). Analytics will be added when these modules are consumed in Plan 3.

---

## File Map

### Created in this plan

```
hikaku/src/
├── lib/
│   ├── youtube/
│   │   ├── types.ts            # All TypeScript interfaces (RawVideo, RawChannel, ComputedReport, etc.)
│   │   ├── client.ts           # YouTube Data API v3 client (fetch channels, playlists, videos)
│   │   ├── metrics.ts          # Orchestrator — runs all modules, returns ComputedReport
│   │   ├── engagement.ts       # Engagement rate calculations (overall, monthly, by duration, top engaged)
│   │   ├── categories.ts       # Video category classification from titles
│   │   ├── distribution.ts     # Statistical distribution (Gini, percentiles, viral thresholds)
│   │   ├── patterns.ts         # Posting patterns (upload frequency, day/hour performance, duration)
│   │   ├── titles.ts           # Title & SEO analysis (question %, emoji %, numbers %, tag analysis)
│   │   ├── growth.ts           # Growth trajectory (monthly aggregation, lifecycle phases, MoM)
│   │   ├── summary.ts          # Executive summary generation (template-based)
│   │   └── verdict.ts          # Head-to-head verdict (multi-dimension scorecard)
│   └── utils.ts                # Updated with shared math/formatting utilities
├── __tests__/
│   └── lib/
│       └── youtube/
│           ├── types.test.ts       # Type guard tests
│           ├── client.test.ts      # YouTube client tests (mocked API)
│           ├── engagement.test.ts  # Engagement computation tests
│           ├── categories.test.ts  # Category classification tests
│           ├── distribution.test.ts # Distribution metric tests
│           ├── patterns.test.ts    # Posting pattern tests
│           ├── titles.test.ts      # Title analysis tests
│           ├── growth.test.ts      # Growth trajectory tests
│           ├── summary.test.ts     # Summary generation tests
│           ├── verdict.test.ts     # Verdict scoring tests
│           ├── metrics.test.ts     # Orchestrator integration test
│           └── fixtures.ts         # Shared test data (real WW vs FRA sample)
```

### Module Dependency Graph

```
types.ts (no imports — pure types)
    ↑
    ├── client.ts (imports types)
    ├── engagement.ts (imports types)
    ├── categories.ts (imports types)
    ├── distribution.ts (imports types)
    ├── patterns.ts (imports types)
    ├── titles.ts (imports types)
    ├── growth.ts (imports types)
    ├── summary.ts (imports types)
    ├── verdict.ts (imports types)
    └── metrics.ts (imports ALL modules — orchestrator)
```

No circular dependencies. Types are the only shared import. Each computation module is a pure function: data in → metrics out.

---

## Chunk 1: Types + Utilities + Test Fixtures

### Task 1: Define all TypeScript interfaces

**Files:**
- Create: `src/lib/youtube/types.ts`
- Test: `src/__tests__/lib/youtube/types.test.ts`

- [ ] **Step 1: Write type validation tests**

Create `src/__tests__/lib/youtube/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import type {
  RawVideo,
  RawChannel,
  MonthlyData,
  EngagementData,
  CategoryData,
  DistributionData,
  PostingPatternsData,
  TitleAnalysisData,
  GrowthData,
  VerdictData,
  ContentFreshnessData,
  SubscriberEfficiencyData,
  ComputedReport,
} from "@/lib/youtube/types"

describe("YouTube types", () => {
  it("RawVideo interface has required fields", () => {
    const video: RawVideo = {
      id: "abc123",
      title: "Test Video",
      publishedAt: "2024-01-01T00:00:00Z",
      views: 1000,
      likes: 50,
      comments: 10,
      durationSec: 600,
      tags: ["test"],
    }
    expect(video.id).toBe("abc123")
    expect(video.views).toBe(1000)
  })

  it("RawChannel interface has required fields", () => {
    const channel: RawChannel = {
      id: "UC123",
      title: "Test Channel",
      handle: "@TestChannel",
      subscriberCount: 1000,
      totalViews: 50000,
      videoCount: 100,
      joinedDate: "2020-01-01T00:00:00Z",
      uploadsPlaylistId: "UU123",
    }
    expect(channel.handle).toBe("@TestChannel")
    expect(channel.uploadsPlaylistId).toBe("UU123")
  })

  it("ComputedReport has all required sections", () => {
    // Type-level check — if this compiles, the interface is correct
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

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/lib/youtube/types.test.ts
```

Expected: FAIL — types module doesn't exist.

- [ ] **Step 3: Implement types**

Create `src/lib/youtube/types.ts`:
```typescript
// ─── Raw Data (from YouTube API, stored in Convex) ───

export interface RawVideo {
  id: string
  title: string
  publishedAt: string // ISO 8601
  views: number
  likes: number
  comments: number
  durationSec: number
  tags: string[]
}

export interface RawChannel {
  id: string
  title: string
  handle: string
  subscriberCount: number
  totalViews: number
  videoCount: number
  joinedDate: string // ISO 8601
  uploadsPlaylistId: string
}

// ─── Computed Metrics (per report section) ───

export interface ChannelOverviewData {
  channel: RawChannel
  avgViewsPerVideo: number
  topVideo: { title: string; views: number }
  viewsPerSub: number
  viewsPerSubPerVideo: number
}

export interface MonthlyData {
  month: string // YYYY-MM
  channelId: string
  videoCount: number
  totalViews: number
  avgViewsPerVideo: number
  totalLikes: number
  totalComments: number
  momChange: number | null // % change from previous month, null for first
}

export interface EngagementData {
  perChannel: {
    channelId: string
    overallRate: number
    likeRate: number
    commentRate: number
    medianPerVideoRate: number
  }[]
  monthly: {
    month: string
    channelId: string
    engagementRate: number
    views: number
  }[]
  byDuration: {
    bucket: string
    channelId: string
    count: number
    avgViews: number
    engagementRate: number
  }[]
  topEngaged: {
    channelId: string
    title: string
    views: number
    engagementRate: number
  }[]
}

export interface CategoryData {
  name: string
  channelId: string
  videoCount: number
  totalViews: number
  avgViews: number
  engagementRate: number
  topVideo: { title: string; views: number }
}

export interface DistributionData {
  perChannel: {
    channelId: string
    mean: number
    median: number
    meanMedianRatio: number
    gini: number
    top10PctShare: number
    percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number; p95: number }
  }[]
  viralThresholds: {
    channelId: string
    gte1k: { count: number; total: number; pct: number }
    gte10k: { count: number; total: number; pct: number }
    gte100k: { count: number; total: number; pct: number }
    gte1m: { count: number; total: number; pct: number }
  }[]
}

export interface PostingPatternsData {
  perChannel: {
    channelId: string
    avgUploadsPerMonth: number
    avgGapDays: number
    medianGapDays: number
    maxGapDays: number
  }[]
  dayOfWeek: {
    day: string
    channelId: string
    count: number
    avgViews: number
  }[]
  hourOfDay: {
    hour: string
    channelId: string
    count: number
    avgViews: number
  }[]
  durationBuckets: {
    bucket: string
    channelId: string
    count: number
    avgViews: number
    engagementRate: number
  }[]
}

export interface TitleAnalysisData {
  perChannel: {
    channelId: string
    avgTitleLength: number
    questionPct: number
    questionAvgViews: number
    emojiPct: number
    emojiAvgViews: number
    numberPct: number
    numberAvgViews: number
  }[]
  topTags: {
    channelId: string
    tags: { tag: string; count: number }[]
  }[]
}

export interface GrowthData {
  monthlyComparison: MonthlyData[]
  lifecyclePhases: {
    channelId: string
    phases: { name: string; period: string; avgMonthlyViews: number; character: string }[]
  }[]
}

export interface SubscriberEfficiencyData {
  perChannel: {
    channelId: string
    viewsPerSub: number
    viewsPerSubPerVideo: number
  }[]
}

export interface ContentFreshnessData {
  perChannel: {
    channelId: string
    recentCount: number
    recentAvgViews: number
    allTimeAvgViews: number
    deltaPercent: number
  }[]
}

export interface VerdictDimension {
  dimension: string
  winnerId: string | null // null = tie
  margin: string
  notes: string
}

export interface VerdictData {
  dimensions: VerdictDimension[]
  summary: string
}

// ─── Full Computed Report ───

export interface ComputedReport {
  meta: {
    generatedAt: string
    channelHandles: string[]
  }
  overview: ChannelOverviewData[]
  monthlyViewership: MonthlyData[]
  engagement: EngagementData
  growth: GrowthData
  distribution: DistributionData
  postingPatterns: PostingPatternsData
  titleAnalysis: TitleAnalysisData
  categories: CategoryData[]
  subscriberEfficiency: SubscriberEfficiencyData
  contentFreshness: ContentFreshnessData
  verdict: VerdictData
  executiveSummary: string
}

// ─── YouTube API Response Types ───

export interface YouTubeChannelResponse {
  items: {
    id: string
    snippet: {
      title: string
      description: string
      publishedAt: string
      customUrl?: string
    }
    statistics: {
      subscriberCount: string
      viewCount: string
      videoCount: string
    }
    contentDetails: {
      relatedPlaylists: {
        uploads: string
      }
    }
  }[]
}

export interface YouTubeSearchResponse {
  items: {
    snippet: {
      channelId: string
      title: string
    }
  }[]
}

export interface YouTubePlaylistItemsResponse {
  items: {
    contentDetails: {
      videoId: string
    }
  }[]
  nextPageToken?: string
}

export interface YouTubeVideoResponse {
  items: {
    id: string
    snippet: {
      title: string
      publishedAt: string
      tags?: string[]
    }
    statistics: {
      viewCount?: string
      likeCount?: string
      commentCount?: string
    }
    contentDetails: {
      duration: string // ISO 8601 duration (PT1H2M3S)
    }
  }[]
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/lib/youtube/types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube/types.ts src/__tests__/lib/youtube/types.test.ts
git commit -m "feat: define all TypeScript interfaces for YouTube data and computed metrics"
```

### Task 2: Add shared utility functions

**Files:**
- Modify: `src/lib/utils.ts`
- Test: `src/__tests__/lib/utils.test.ts`

- [ ] **Step 1: Write utility tests**

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
} from "@/lib/utils"

describe("formatNumber", () => {
  it("formats millions", () => expect(formatNumber(1500000)).toBe("1.50M"))
  it("formats thousands", () => expect(formatNumber(45000)).toBe("45.0K"))
  it("formats small numbers", () => expect(formatNumber(999)).toBe("999"))
  it("handles zero", () => expect(formatNumber(0)).toBe("0"))
})

describe("median", () => {
  it("returns median of odd array", () => expect(median([1, 3, 5])).toBe(3))
  it("returns median of even array", () => expect(median([1, 2, 3, 4])).toBe(2))
  it("handles single element", () => expect(median([42])).toBe(42))
  it("handles empty array", () => expect(median([])).toBe(0))
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
})

describe("engagementRate", () => {
  it("computes correct rate", () => {
    expect(engagementRate(50, 10, 1000)).toBeCloseTo(6.0)
  })
  it("handles zero views", () => {
    expect(engagementRate(10, 5, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- src/__tests__/lib/utils.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add utility functions to utils.ts**

Add to `src/lib/utils.ts` (keep existing `cn` function):
```typescript
// ─── Math Utilities ───

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export const median = (arr: number[]): number => {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export const percentile = (arr: number[], p: number): number => {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((sorted.length * p) / 100)
  return sorted[Math.min(idx, sorted.length - 1)]
}

export const computeGini = (values: number[]): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, v) => s + v, 0) / n
  if (mean === 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += (2 * (i + 1) - n - 1) * sorted[i]
  return sum / (n * n * mean)
}

export const parseDuration = (iso8601: string): number => {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (
    (parseInt(match[1] || "0") * 3600) +
    (parseInt(match[2] || "0") * 60) +
    parseInt(match[3] || "0")
  )
}

export const engagementRate = (likes: number, comments: number, views: number): number => {
  if (views === 0) return 0
  return ((likes + comments) / views) * 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- src/__tests__/lib/utils.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/__tests__/lib/utils.test.ts
git commit -m "feat: add shared math/formatting utilities (formatNumber, median, percentile, Gini, parseDuration)"
```

### Task 3: Create test fixtures with real data

**Files:**
- Create: `src/__tests__/lib/youtube/fixtures.ts`

- [ ] **Step 1: Create shared test fixture data**

Create `src/__tests__/lib/youtube/fixtures.ts` with sample data from the WW vs FRA analysis:
```typescript
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

// Sample channels based on real WW vs FRA data
export const sampleChannelA: RawChannel = {
  id: "UCggPd3Vf9ooG2r4I_ZNWBzA",
  title: "Wint Wealth",
  handle: "@WintWealthYT",
  subscriberCount: 729000,
  totalViews: 108560000,
  videoCount: 239,
  joinedDate: "2021-03-21T00:00:00Z",
  uploadsPlaylistId: "UUggPd3Vf9ooG2r4I_ZNWBzA",
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
}

// Sample videos — representative subset for testing
export const sampleVideosA: RawVideo[] = [
  {
    id: "v1",
    title: "Is Gold Savings Scheme the best way to invest in gold?",
    publishedAt: "2024-11-26T00:00:00Z",
    views: 7233273,
    likes: 130041,
    comments: 1296,
    durationSec: 51,
    tags: ["gold", "investing", "money"],
  },
  {
    id: "v2",
    title: "Is Being Employed Stupid?",
    publishedAt: "2024-08-03T00:00:00Z",
    views: 5646351,
    likes: 161844,
    comments: 823,
    durationSec: 37,
    tags: ["money", "salary", "financial independence"],
  },
  {
    id: "v3",
    title: "How much money you need to RETIRE?",
    publishedAt: "2023-12-13T00:00:00Z",
    views: 3238633,
    likes: 64142,
    comments: 992,
    durationSec: 52,
    tags: ["retirement", "money", "passive income"],
  },
  {
    id: "v4",
    title: "Expense Covered by Passive Income",
    publishedAt: "2023-09-11T00:00:00Z",
    views: 2181731,
    likes: 28177,
    comments: 734,
    durationSec: 724,
    tags: ["passive income", "financial independence"],
  },
  {
    id: "v5",
    title: "His 'Boring' FDs Created A 10 Crore Empire",
    publishedAt: "2024-02-15T00:00:00Z",
    views: 15000,
    likes: 200,
    comments: 30,
    durationSec: 900,
    tags: ["fd", "fixed deposit"],
  },
]

export const sampleVideosB: RawVideo[] = [
  {
    id: "v6",
    title: "How Are Bonds Taxed in India? | Interest & Capital Gains Explained",
    publishedAt: "2025-08-27T00:00:00Z",
    views: 8053,
    likes: 83,
    comments: 15,
    durationSec: 89,
    tags: ["bonds", "taxation", "fixed income investing"],
  },
  {
    id: "v7",
    title: "Are Corporate Bonds Really Safe? | Credit Ratings Explained",
    publishedAt: "2025-09-15T00:00:00Z",
    views: 6814,
    likes: 118,
    comments: 8,
    durationSec: 68,
    tags: ["corporate bonds", "credit rating", "safe investment options"],
  },
  {
    id: "v8",
    title: "How to Build a Monthly Passive Income Using a Bond Ladder",
    publishedAt: "2025-11-19T00:00:00Z",
    views: 5931,
    likes: 129,
    comments: 12,
    durationSec: 134,
    tags: ["passive income", "bond ladder", "fixed income investing"],
  },
  {
    id: "v9",
    title: "YTM vs Coupon Rate | What Every Investor Needs To Know",
    publishedAt: "2025-09-29T00:00:00Z",
    views: 5461,
    likes: 148,
    comments: 40,
    durationSec: 257,
    tags: ["ytm", "coupon rate", "bond investing"],
  },
  {
    id: "v10",
    title: "What Are Bonds? Beginner's Guide to Understanding Bonds",
    publishedAt: "2025-10-05T00:00:00Z",
    views: 268,
    likes: 5,
    comments: 0,
    durationSec: 62,
    tags: ["bonds", "beginner", "what are bonds"],
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/__tests__/lib/youtube/fixtures.ts
git commit -m "feat: add test fixtures with real WW vs FRA sample data"
```

---

## Chunk 2: YouTube API Client

### Task 4: Implement YouTube Data API v3 client

**Files:**
- Create: `src/lib/youtube/client.ts`
- Test: `src/__tests__/lib/youtube/client.test.ts`

- [ ] **Step 1: Write client tests (mocked API)**

Create `src/__tests__/lib/youtube/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("YouTube client", () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  describe("resolveChannel", () => {
    it("resolves a channel handle to channel data", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [{ snippet: { channelId: "UC123", title: "Test Channel" } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              id: "UC123",
              snippet: { title: "Test Channel", publishedAt: "2020-01-01T00:00:00Z", customUrl: "@TestChannel" },
              statistics: { subscriberCount: "1000", viewCount: "50000", videoCount: "100" },
              contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            }],
          }),
        })

      const { resolveChannel } = await import("@/lib/youtube/client")
      const channel = await resolveChannel("@TestChannel", "test-api-key")

      expect(channel).toBeDefined()
      expect(channel.id).toBe("UC123")
      expect(channel.subscriberCount).toBe(1000)
      expect(channel.uploadsPlaylistId).toBe("UU123")
    })

    it("throws on channel not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await expect(resolveChannel("@NotReal", "key")).rejects.toThrow("Channel not found")
    })
  })

  describe("fetchAllVideos", () => {
    it("fetches videos from uploads playlist", async () => {
      // Mock playlist items (1 page)
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
              snippet: { title: "Video 1", publishedAt: "2024-01-01T00:00:00Z", tags: ["test"] },
              statistics: { viewCount: "1000", likeCount: "50", commentCount: "10" },
              contentDetails: { duration: "PT5M30S" },
            },
            {
              id: "v2",
              snippet: { title: "Video 2", publishedAt: "2024-02-01T00:00:00Z" },
              statistics: { viewCount: "500", likeCount: "25", commentCount: "5" },
              contentDetails: { duration: "PT10M" },
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
      expect(videos[1].tags).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- src/__tests__/lib/youtube/client.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement YouTube client**

Create `src/lib/youtube/client.ts`:
```typescript
import { parseDuration } from "@/lib/utils"
import type { RawChannel, RawVideo } from "./types"

const BASE_URL = "https://www.googleapis.com/youtube/v3"

const ytFetch = async <T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> => {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set("key", apiKey)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`YouTube API error (${res.status}): ${JSON.stringify(err.error?.message || err)}`)
  }
  return res.json()
}

export const resolveChannel = async (handle: string, apiKey: string): Promise<RawChannel> => {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`

  // Search for channel by handle
  const searchData = await ytFetch<{ items: { snippet: { channelId: string; title: string } }[] }>(
    "search",
    { part: "snippet", q: cleanHandle, type: "channel", maxResults: "1" },
    apiKey
  )

  if (!searchData.items?.length) throw new Error(`Channel not found: ${handle}`)
  const channelId = searchData.items[0].snippet.channelId

  // Get full channel details
  const channelData = await ytFetch<{
    items: {
      id: string
      snippet: { title: string; publishedAt: string; customUrl?: string }
      statistics: { subscriberCount: string; viewCount: string; videoCount: string }
      contentDetails: { relatedPlaylists: { uploads: string } }
    }[]
  }>("channels", { part: "statistics,snippet,contentDetails", id: channelId }, apiKey)

  if (!channelData.items?.length) throw new Error(`Channel details not found: ${channelId}`)

  const ch = channelData.items[0]
  return {
    id: ch.id,
    title: ch.snippet.title,
    handle: ch.snippet.customUrl || cleanHandle,
    subscriberCount: Number(ch.statistics.subscriberCount),
    totalViews: Number(ch.statistics.viewCount),
    videoCount: Number(ch.statistics.videoCount),
    joinedDate: ch.snippet.publishedAt,
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  }
}

export const fetchAllVideos = async (uploadsPlaylistId: string, apiKey: string): Promise<RawVideo[]> => {
  const videoIds: string[] = []
  let nextPageToken: string | undefined

  // Paginate through playlist to get all video IDs
  do {
    const params: Record<string, string> = {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    }
    if (nextPageToken) params.pageToken = nextPageToken

    const data = await ytFetch<{ items: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(
      "playlistItems",
      params,
      apiKey
    )
    for (const item of data.items || []) videoIds.push(item.contentDetails.videoId)
    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  // Fetch video details in batches of 50
  const videos: RawVideo[] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const data = await ytFetch<{
      items: {
        id: string
        snippet: { title: string; publishedAt: string; tags?: string[] }
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
        contentDetails: { duration: string }
      }[]
    }>("videos", { part: "snippet,statistics,contentDetails", id: batch.join(",") }, apiKey)

    for (const v of data.items || []) {
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        durationSec: parseDuration(v.contentDetails.duration),
        tags: v.snippet.tags || [],
      })
    }
  }

  return videos
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- src/__tests__/lib/youtube/client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube/client.ts src/__tests__/lib/youtube/client.test.ts
git commit -m "feat: implement YouTube Data API v3 client (channel resolution + video fetching)"
```

---

## Chunk 3: Core Computation Modules

Each module is a pure function: raw data in → typed metrics out. No side effects, no API calls, no state.

### Task 5: Engagement computation

**Files:**
- Create: `src/lib/youtube/engagement.ts`
- Test: `src/__tests__/lib/youtube/engagement.test.ts`

- [ ] **Step 1: Write engagement tests using fixtures**

Create `src/__tests__/lib/youtube/engagement.test.ts`:
```typescript
import { describe, it, expect } from "vitest"
import { computeEngagement } from "@/lib/youtube/engagement"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

describe("computeEngagement", () => {
  const result = computeEngagement(
    [sampleChannelA, sampleChannelB],
    { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
  )

  it("computes per-channel overall engagement rate", () => {
    expect(result.perChannel).toHaveLength(2)
    const chA = result.perChannel.find((c) => c.channelId === sampleChannelA.id)!
    expect(chA.overallRate).toBeGreaterThan(0)
    expect(chA.likeRate).toBeGreaterThan(0)
    expect(chA.commentRate).toBeGreaterThan(0)
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
    result.byDuration.forEach((d) => {
      expect(["0-30s", "30-60s", "1-2min", "2-5min", "5-10min", "10-20min", "20min+"]).toContain(d.bucket)
    })
  })

  it("returns top engaged videos (min 500 views)", () => {
    result.topEngaged.forEach((v) => {
      expect(v.views).toBeGreaterThanOrEqual(500)
      expect(v.engagementRate).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test → FAIL, then implement, then run test → PASS**

Implement `src/lib/youtube/engagement.ts`:

The module should:
1. Compute overall engagement rate per channel: `(totalLikes + totalComments) / totalViews * 100`
2. Compute like rate and comment rate separately
3. Compute median per-video engagement
4. Group by month and compute monthly engagement trends
5. Group by duration bucket (0-30s, 30-60s, 1-2min, 2-5min, 5-10min, 10-20min, 20min+)
6. Find top 5 most engaged videos per channel (min 500 views)

Function signature:
```typescript
export const computeEngagement = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): EngagementData
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/youtube/engagement.ts src/__tests__/lib/youtube/engagement.test.ts
git commit -m "feat: implement engagement computation (overall, monthly, by duration, top engaged)"
```

### Task 6: Category classification

**Files:**
- Create: `src/lib/youtube/categories.ts`
- Test: `src/__tests__/lib/youtube/categories.test.ts`

- [ ] **Step 1: Write category tests**

```typescript
import { describe, it, expect } from "vitest"
import { classifyVideo, computeCategories } from "@/lib/youtube/categories"

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
  it("classifies myths", () => {
    expect(classifyVideo("The Hidden Truth of the Bond Market")).toBe("Myths/Mistakes")
  })
  it("falls back to Other", () => {
    expect(classifyVideo("Random Unrelated Title")).toBe("Other")
  })
})
```

- [ ] **Step 2: Implement categories module**

Function signatures:
```typescript
export const classifyVideo = (title: string): string
export const computeCategories = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): CategoryData[]
```

Uses the keyword-based classification from spec Section 8.1. `computeCategories` groups videos by category per channel, computes avg views, engagement rate, and top video for each.

- [ ] **Step 3: Commit**

### Task 7: Distribution & virality

**Files:**
- Create: `src/lib/youtube/distribution.ts`
- Test: `src/__tests__/lib/youtube/distribution.test.ts`

- [ ] **Step 1: Write distribution tests**

Test Gini coefficient, percentiles, mean/median ratio, viral thresholds (≥1K, ≥10K, ≥100K, ≥1M).

Function signature:
```typescript
export const computeDistribution = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): DistributionData
```

- [ ] **Step 2: Implement, test passes, commit**

### Task 8: Posting patterns

**Files:**
- Create: `src/lib/youtube/patterns.ts`
- Test: `src/__tests__/lib/youtube/patterns.test.ts`

Computes: upload frequency, day-of-week performance, hour-of-day performance (IST), duration sweet spot.

Function signature:
```typescript
export const computePostingPatterns = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): PostingPatternsData
```

### Task 9: Title & SEO analysis

**Files:**
- Create: `src/lib/youtube/titles.ts`
- Test: `src/__tests__/lib/youtube/titles.test.ts`

Computes: question title %, emoji %, number/₹ %, avg title length, top 15 tags per channel.

Function signature:
```typescript
export const computeTitleAnalysis = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): TitleAnalysisData
```

### Task 10: Growth trajectory

**Files:**
- Create: `src/lib/youtube/growth.ts`
- Test: `src/__tests__/lib/youtube/growth.test.ts`

Computes: monthly viewership aggregation, MoM change %, lifecycle phase detection.

Function signature:
```typescript
export const computeGrowth = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): GrowthData
```

### Task 11: Executive summary generation

**Files:**
- Create: `src/lib/youtube/summary.ts`
- Test: `src/__tests__/lib/youtube/summary.test.ts`

Template-based generation: identifies top metric per channel, trend, key insight.

Function signature:
```typescript
export const generateSummary = (
  channels: RawChannel[],
  engagement: EngagementData,
  distribution: DistributionData,
  contentFreshness: ContentFreshnessData
): string
```

### Task 12: Head-to-head verdict

**Files:**
- Create: `src/lib/youtube/verdict.ts`
- Test: `src/__tests__/lib/youtube/verdict.test.ts`

Scores across 14 dimensions, determines winner per dimension.

Function signature:
```typescript
export const computeVerdict = (
  channels: RawChannel[],
  overview: ChannelOverviewData[],
  engagement: EngagementData,
  distribution: DistributionData,
  postingPatterns: PostingPatternsData,
  titleAnalysis: TitleAnalysisData,
  contentFreshness: ContentFreshnessData
): VerdictData
```

---

## Chunk 4: Orchestrator + Integration Test

### Task 13: Metrics orchestrator

**Files:**
- Create: `src/lib/youtube/metrics.ts`
- Test: `src/__tests__/lib/youtube/metrics.test.ts`

The orchestrator calls all computation modules and assembles the `ComputedReport`.

```typescript
export const computeReport = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): ComputedReport
```

- [ ] **Step 1: Write integration test**

Uses all fixtures, verifies the full `ComputedReport` structure is returned with all 13 sections populated.

- [ ] **Step 2: Implement orchestrator**

```typescript
import type { RawChannel, RawVideo, ComputedReport } from "./types"
import { computeEngagement } from "./engagement"
import { computeCategories } from "./categories"
import { computeDistribution } from "./distribution"
import { computePostingPatterns } from "./patterns"
import { computeTitleAnalysis } from "./titles"
import { computeGrowth } from "./growth"
import { generateSummary } from "./summary"
import { computeVerdict } from "./verdict"

export const computeReport = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): ComputedReport => {
  const allVideos = Object.values(videosByChannel).flat()

  // Compute each section independently
  const overview = channels.map((ch) => {
    const videos = videosByChannel[ch.id] || []
    const totalViews = videos.reduce((s, v) => s + v.views, 0)
    const sorted = [...videos].sort((a, b) => b.views - a.views)
    return {
      channel: ch,
      avgViewsPerVideo: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
      topVideo: sorted[0] ? { title: sorted[0].title, views: sorted[0].views } : { title: "", views: 0 },
      viewsPerSub: ch.subscriberCount > 0 ? totalViews / ch.subscriberCount : 0,
      viewsPerSubPerVideo: ch.subscriberCount > 0 && videos.length > 0 ? totalViews / ch.subscriberCount / videos.length : 0,
    }
  })

  const engagement = computeEngagement(channels, videosByChannel)
  const categories = computeCategories(channels, videosByChannel)
  const distribution = computeDistribution(channels, videosByChannel)
  const postingPatterns = computePostingPatterns(channels, videosByChannel)
  const titleAnalysis = computeTitleAnalysis(channels, videosByChannel)
  const growth = computeGrowth(channels, videosByChannel)

  const subscriberEfficiency = {
    perChannel: channels.map((ch) => {
      const videos = videosByChannel[ch.id] || []
      const totalViews = videos.reduce((s, v) => s + v.views, 0)
      return {
        channelId: ch.id,
        viewsPerSub: ch.subscriberCount > 0 ? totalViews / ch.subscriberCount : 0,
        viewsPerSubPerVideo: ch.subscriberCount > 0 && videos.length > 0 ? totalViews / ch.subscriberCount / videos.length : 0,
      }
    }),
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const contentFreshness = {
    perChannel: channels.map((ch) => {
      const videos = videosByChannel[ch.id] || []
      const totalViews = videos.reduce((s, v) => s + v.views, 0)
      const allTimeAvg = videos.length > 0 ? Math.round(totalViews / videos.length) : 0
      const recent = videos.filter((v) => new Date(v.publishedAt) >= thirtyDaysAgo)
      const recentViews = recent.reduce((s, v) => s + v.views, 0)
      const recentAvg = recent.length > 0 ? Math.round(recentViews / recent.length) : 0
      return {
        channelId: ch.id,
        recentCount: recent.length,
        recentAvgViews: recentAvg,
        allTimeAvgViews: allTimeAvg,
        deltaPercent: allTimeAvg > 0 ? ((recentAvg - allTimeAvg) / allTimeAvg) * 100 : 0,
      }
    }),
  }

  const verdict = computeVerdict(channels, overview, engagement, distribution, postingPatterns, titleAnalysis, contentFreshness)
  const executiveSummary = generateSummary(channels, engagement, distribution, contentFreshness)

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      channelHandles: channels.map((ch) => ch.handle),
    },
    overview,
    monthlyViewership: growth.monthlyComparison,
    engagement,
    growth,
    distribution,
    postingPatterns,
    titleAnalysis,
    categories,
    subscriberEfficiency,
    contentFreshness,
    verdict,
    executiveSummary,
  }
}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/youtube/metrics.ts src/__tests__/lib/youtube/metrics.test.ts
git commit -m "feat: implement metrics orchestrator — assembles full ComputedReport from all modules"
```

### Task 14: Final verification + push

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Push and open PR**

```bash
git push origin feature/plan-2-metrics-engine
```

---

## Verification Checklist

- [ ] All tests pass (expected: 40+ tests across types, utils, client, and 8 computation modules)
- [ ] `pnpm build` succeeds
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] Every computation module is a pure function (no side effects, no API calls)
- [ ] Every module has independent tests using shared fixtures
- [ ] Types file has zero implementation imports (pure interfaces)
- [ ] Metrics orchestrator produces a complete ComputedReport with all 13 sections

---

## Next Plan

After Plan 2 is complete, proceed to **Plan 3: Pages + Report UI** — building the landing page form, comparison page with SSE + phased reveal, and all 12 report section components.
