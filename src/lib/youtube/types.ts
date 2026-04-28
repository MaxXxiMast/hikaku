/**
 * types.ts — YouTube Data API v3 response schemas and normalized interfaces.
 *
 * Zod schemas parse and validate raw API responses (fat storage approach).
 * TypeScript interfaces define normalized shapes used by computation modules.
 *
 * Zero implementation imports — only types, Zod schemas, and constants.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Zod schemas: YouTube Data API v3 response shapes
// ---------------------------------------------------------------------------

const YouTubeThumbnailSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const YouTubeThumbnailsSchema = z.object({
  default: YouTubeThumbnailSchema.optional(),
  medium: YouTubeThumbnailSchema.optional(),
  high: YouTubeThumbnailSchema.optional(),
  standard: YouTubeThumbnailSchema.optional(),
  maxres: YouTubeThumbnailSchema.optional(),
})

export const YouTubeChannelResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        publishedAt: z.string(),
        customUrl: z.string().optional(),
        description: z.string().optional().default(""),
        thumbnails: YouTubeThumbnailsSchema.optional(),
        country: z.string().optional(),
        defaultLanguage: z.string().optional(),
      }),
      statistics: z.object({
        subscriberCount: z.coerce.number().finite().optional().default(0),
        viewCount: z.coerce.number().finite().optional().default(0),
        videoCount: z.coerce.number().finite().optional().default(0),
        hiddenSubscriberCount: z.boolean().optional(),
      }),
      contentDetails: z.object({
        relatedPlaylists: z.object({
          uploads: z.string(),
          likes: z.string().optional(),
        }),
      }),
      brandingSettings: z
        .object({
          channel: z
            .object({
              keywords: z
                .string()
                .optional()
                .transform((s) => (s ? s.split(" ").filter(Boolean) : [])),
              title: z.string().optional(),
              description: z.string().optional(),
              country: z.string().optional(),
            })
            .optional(),
          image: z
            .object({
              bannerExternalUrl: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      topicDetails: z
        .object({
          topicCategories: z.array(z.string()).optional().default([]),
        })
        .optional(),
    })
  ),
  nextPageToken: z.string().optional(),
  pageInfo: z
    .object({
      totalResults: z.number().optional(),
      resultsPerPage: z.number().optional(),
    })
    .optional(),
})

export const YouTubeVideoResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z
        .object({
          title: z.string().optional(),
          publishedAt: z.string().optional(),
          description: z.string().optional().default(""),
          tags: z.array(z.string()).optional().default([]),
          categoryId: z.string().optional(),
          channelId: z.string().optional(),
          defaultLanguage: z.string().optional(),
          defaultAudioLanguage: z.string().optional(),
          thumbnails: YouTubeThumbnailsSchema.optional(),
        })
        .optional(),
      statistics: z
        .object({
          viewCount: z.coerce.number().finite().optional().default(0),
          likeCount: z.coerce.number().finite().optional().default(0),
          commentCount: z.coerce.number().finite().optional().default(0),
          favoriteCount: z.coerce.number().finite().optional().default(0),
        })
        .optional(),
      contentDetails: z
        .object({
          duration: z.string().optional(),
          definition: z.string().optional(),
          caption: z.string().optional(),
          licensedContent: z.boolean().optional(),
        })
        .optional(),
      topicDetails: z
        .object({
          topicCategories: z.array(z.string()).optional().default([]),
        })
        .optional(),
    })
  ),
  nextPageToken: z.string().optional(),
  pageInfo: z
    .object({
      totalResults: z.number().optional(),
      resultsPerPage: z.number().optional(),
    })
    .optional(),
})

export const YouTubePlaylistItemsResponseSchema = z.object({
  items: z.array(
    z.object({
      contentDetails: z.object({
        videoId: z.string(),
        videoPublishedAt: z.string().optional(),
      }),
    })
  ),
  nextPageToken: z.string().optional(),
  pageInfo: z
    .object({
      totalResults: z.number().optional(),
      resultsPerPage: z.number().optional(),
    })
    .optional(),
})

// ---------------------------------------------------------------------------
// Inferred types from Zod schemas
// ---------------------------------------------------------------------------

export type YouTubeChannelResponse = z.infer<typeof YouTubeChannelResponseSchema>
export type YouTubeVideoResponse = z.infer<typeof YouTubeVideoResponseSchema>
export type YouTubePlaylistItemsResponse = z.infer<typeof YouTubePlaylistItemsResponseSchema>

// ---------------------------------------------------------------------------
// Normalized interfaces: used by computation modules
// ---------------------------------------------------------------------------

export interface RawVideo {
  // Core (used by V1 computation modules)
  id: string
  title: string
  publishedAt: string        // ISO 8601
  views: number
  likes: number
  comments: number
  durationSec: number
  tags: string[]

  // Extended (stored for future analysis, not used by V1 modules)
  description: string
  categoryId: string         // YouTube's own category ID
  channelId: string
  thumbnailUrl: string       // Default thumbnail
  topicCategories: string[]  // Wikipedia-based topic URLs
  definition: string         // "hd" or "sd"
  caption: boolean           // Whether captions are available
  defaultLanguage?: string
}

export interface RawChannel {
  // Core (used by V1 computation modules)
  id: string
  title: string
  handle: string
  subscriberCount: number
  totalViews: number
  videoCount: number
  joinedDate: string         // ISO 8601
  uploadsPlaylistId: string

  // Extended (stored for future analysis)
  description: string
  country?: string
  thumbnailUrl: string       // Channel avatar
  bannerUrl?: string         // Channel banner
  keywords: string[]         // Channel-level SEO (from brandingSettings)
  topicCategories: string[]  // Wikipedia-based topic URLs
}

// ---------------------------------------------------------------------------
// Computed report sub-types
// ---------------------------------------------------------------------------

export interface ChannelOverviewData {
  channel: RawChannel
  avgViewsPerVideo: number
  topVideo: { title: string; views: number }
  viewsPerSub: number
  viewsPerSubPerVideo: number
}

export interface MonthlyData {
  month: string              // YYYY-MM
  channelId: string
  videoCount: number
  totalViews: number
  avgViewsPerVideo: number
  totalLikes: number
  totalComments: number
  momChange: number | null   // % change from previous month, null for first
}

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
  perChannel: { channelId: string; avgUploadsPerMonth: number; avgGapDays: number; medianGapDays: number; maxGapDays: number }[]
  dayOfWeek: { day: string; channelId: string; count: number; avgViews: number }[]
  hourOfDay: { hour: string; channelId: string; count: number; avgViews: number }[]
  durationBuckets: { bucket: string; channelId: string; count: number; avgViews: number; engagementRate: number }[]
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
  topTags: { channelId: string; tags: { tag: string; count: number }[] }[]
}

export interface GrowthData {
  monthlyComparison: MonthlyData[]   // Serves Report Section 3 (MoM Viewership)
  lifecyclePhases: {                 // Serves Report Section 5 (Growth Trajectory)
    channelId: string
    phases: { name: string; period: string; avgMonthlyViews: number; character: string }[]
  }[]
  firstNMonths: {
    n: number
    perChannel: {
      channelId: string
      months: MonthlyData[]
      totalViews: number
      avgViewsPerVideo: number
    }[]
  }
}

export interface SubscriberEfficiencyData {
  perChannel: { channelId: string; viewsPerSub: number; viewsPerSubPerVideo: number }[]
}

export interface ContentFreshnessData {
  perChannel: { channelId: string; recentCount: number; recentAvgViews: number; allTimeAvgViews: number; deltaPercent: number }[]
}

export interface VerdictDimension {
  dimension: string
  winnerId: string | null    // null = tie (difference < 5%)
  margin: string             // "Slight" | "Moderate" | "Strong" | ""
  notes: string
}

export interface VerdictData {
  dimensions: VerdictDimension[]   // 15 dimensions
  summary: string
}

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DURATION_BUCKETS = [
  "0-30s",
  "30-60s",
  "1-2min",
  "2-5min",
  "5-10min",
  "10-20min",
  "20min+",
] as const

export type DurationBucket = (typeof DURATION_BUCKETS)[number]
