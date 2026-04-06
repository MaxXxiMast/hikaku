/**
 * fixtures.ts — Shared test data for computation module tests (Tasks 3.1–3.6, 4.1–4.2, 5.1).
 *
 * Based on a real WW (Wint Wealth) vs FRA (Fixed Returns Academy) YouTube comparison.
 * All values are realistic but some are approximated for test determinism.
 *
 * Key design constraint for distribution tests:
 *   - sampleVideosA (WW) has a highly skewed view distribution → high Gini coefficient
 *   - sampleVideosB (FRA) has a uniform view distribution → low Gini coefficient
 */

import type {
  RawChannel,
  RawVideo,
  ChannelOverviewData,
  SubscriberEfficiencyData,
  ContentFreshnessData,
} from "@/lib/youtube/types"

// ---------------------------------------------------------------------------
// Channel fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Video fixtures — Wint Wealth (Channel A)
//
// Distribution design: one mega-viral video (2M views) + smaller videos (50K–250K).
// This creates a high Gini coefficient needed for distribution tests.
//
// Category signals baked into titles (used by categories.ts):
//   "Tax" → Tax / Legal, "passive income" → Passive Income, "fd vs bonds" → Comparison,
//   "credit rating" → Credit / Ratings, "ytm" → Fixed Income Analysis,
//   "mutual fund" → Mutual Funds, "rbi" → Macro / Policy, "ncd" → NCD / Bonds,
//   "how to" / "mistake" / "vs" → SEO/title pattern tests
//
// Span: 2024-01 through 2025-01 (≥3 months, covering >6 calendar months)
// Duration mix: 1 short (<60s), 2 medium (300–600s), 3 long (>600s)
// ---------------------------------------------------------------------------

export const sampleVideosA: RawVideo[] = [
  // Video 1 — VIRAL anchor: long, high views, finance tax topic, question title
  {
    id: "ww_v1",
    title: "How Are Bonds Taxed in India? Complete Guide",
    publishedAt: "2024-01-15T18:00:00Z",
    views: 2000000,
    likes: 80000,
    comments: 4000,
    durationSec: 720,   // 12 min — long
    tags: ["bonds", "tax", "india", "investing"],
    description: "Complete guide on bond taxation in India",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v1/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 2 — medium views, passive income keyword, medium duration
  {
    id: "ww_v2",
    title: "Earn passive income without risk — bonds explained",
    publishedAt: "2024-02-20T10:00:00Z",
    views: 250000,
    likes: 9500,
    comments: 480,
    durationSec: 480,   // 8 min — medium
    tags: ["passive income", "bonds", "fixed income"],
    description: "How to build passive income using bonds",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v2/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 3 — medium views, FD vs bonds comparison, long duration
  {
    id: "ww_v3",
    title: "FD vs Bonds — Which gives better returns? Full comparison",
    publishedAt: "2024-03-10T14:00:00Z",
    views: 180000,
    likes: 7200,
    comments: 360,
    durationSec: 900,   // 15 min — long
    tags: ["fd vs bonds", "fixed deposit", "bonds", "comparison"],
    description: "Detailed FD vs bonds comparison for Indian investors",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v3/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: true,
  },

  // Video 4 — lower views, credit rating topic, medium duration
  {
    id: "ww_v4",
    title: "Credit rating explained — What AAA, AA, A actually means",
    publishedAt: "2024-04-05T09:00:00Z",
    views: 95000,
    likes: 3800,
    comments: 190,
    durationSec: 540,   // 9 min — medium
    tags: ["credit rating", "bonds", "investing"],
    description: "Understanding credit ratings for bond investors",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v4/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 5 — short-form, YTM / NCD topic, Short duration (<60s)
  {
    id: "ww_v5",
    title: "What is YTM? NCD investing in 50 seconds",
    publishedAt: "2024-06-15T12:00:00Z",
    views: 50000,
    likes: 1800,
    comments: 90,
    durationSec: 50,    // 50 sec — short (<60s)
    tags: ["ytm", "ncd", "bonds"],
    description: "Quick explainer on Yield to Maturity and NCDs",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v5/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 6 — RBI / macro topic, mistake keyword, long duration
  {
    id: "ww_v6",
    title: "5 mutual fund mistakes to avoid — RBI policy impact",
    publishedAt: "2025-01-20T16:00:00Z",
    views: 75000,
    likes: 3000,
    comments: 150,
    durationSec: 660,   // 11 min — long
    tags: ["mutual fund", "rbi", "mistakes", "investing"],
    description: "Common mutual fund mistakes under RBI policy changes",
    categoryId: "27",
    channelId: "UCggPd3Vf9ooG2r4I_ZNWBzA",
    thumbnailUrl: "https://i.ytimg.com/vi/ww_v6/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },
]

// ---------------------------------------------------------------------------
// Video fixtures — Fixed Returns Academy (Channel B)
//
// Distribution design: all videos in 200–3000 view range → low Gini coefficient.
// FRA is a new small channel (launched July 2025) so dates start from there.
// Span: 2025-08 through 2025-10 (≥2 months)
// ---------------------------------------------------------------------------

export const sampleVideosB: RawVideo[] = [
  // Video 1 — bonds intro, finance topic
  {
    id: "fra_v1",
    title: "How to invest in bonds — A beginner guide",
    publishedAt: "2025-08-05T10:00:00Z",
    views: 2800,
    likes: 112,
    comments: 14,
    durationSec: 420,   // 7 min — medium
    tags: ["bonds", "investing", "fixed income"],
    description: "Beginner's guide to investing in bonds",
    categoryId: "27",
    channelId: "UCPHv636tYhtARLzoINsGQVw",
    thumbnailUrl: "https://i.ytimg.com/vi/fra_v1/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 2 — credit rating, short duration
  {
    id: "fra_v2",
    title: "Credit rating vs bond yield — what's the connection?",
    publishedAt: "2025-08-20T14:00:00Z",
    views: 1900,
    likes: 76,
    comments: 9,
    durationSec: 210,   // 3.5 min — short-medium
    tags: ["credit rating", "yield", "bonds"],
    description: "How credit ratings affect bond yields",
    categoryId: "27",
    channelId: "UCPHv636tYhtARLzoINsGQVw",
    thumbnailUrl: "https://i.ytimg.com/vi/fra_v2/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 3 — NCD topic, medium duration
  {
    id: "fra_v3",
    title: "NCD investing — risks and returns explained",
    publishedAt: "2025-09-08T11:00:00Z",
    views: 2200,
    likes: 88,
    comments: 11,
    durationSec: 360,   // 6 min — medium
    tags: ["ncd", "bonds", "fixed income"],
    description: "Everything about Non-Convertible Debentures",
    categoryId: "27",
    channelId: "UCPHv636tYhtARLzoINsGQVw",
    thumbnailUrl: "https://i.ytimg.com/vi/fra_v3/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 4 — YTM, question title
  {
    id: "fra_v4",
    title: "Is YTM the real return you get from a bond?",
    publishedAt: "2025-09-22T09:00:00Z",
    views: 1600,
    likes: 64,
    comments: 8,
    durationSec: 300,   // 5 min — medium
    tags: ["ytm", "bonds", "returns"],
    description: "Demystifying Yield to Maturity for bond investors",
    categoryId: "27",
    channelId: "UCPHv636tYhtARLzoINsGQVw",
    thumbnailUrl: "https://i.ytimg.com/vi/fra_v4/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },

  // Video 5 — passive income, shorter video
  {
    id: "fra_v5",
    title: "Fixed income passive income strategy",
    publishedAt: "2025-10-10T15:00:00Z",
    views: 2500,
    likes: 100,
    comments: 12,
    durationSec: 480,   // 8 min — medium
    tags: ["passive income", "fixed income", "bonds"],
    description: "Building a passive income portfolio with fixed income",
    categoryId: "27",
    channelId: "UCPHv636tYhtARLzoINsGQVw",
    thumbnailUrl: "https://i.ytimg.com/vi/fra_v5/default.jpg",
    topicCategories: [],
    definition: "hd",
    caption: false,
  },
]

// ---------------------------------------------------------------------------
// Reference date — used by freshness and growth tests
// ---------------------------------------------------------------------------

export const REFERENCE_DATE = new Date("2026-03-01T00:00:00Z")

// ---------------------------------------------------------------------------
// YouTube API response fixtures
// Used by client.ts and parser unit tests
// ---------------------------------------------------------------------------

export const sampleYouTubeChannelResponse = {
  items: [
    {
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
      contentDetails: {
        relatedPlaylists: { uploads: sampleChannelA.uploadsPlaylistId },
      },
      brandingSettings: {
        channel: { keywords: sampleChannelA.keywords.join(" ") },
      },
      topicDetails: { topicCategories: sampleChannelA.topicCategories },
    },
  ],
}

export const sampleYouTubeVideoResponse = {
  items: [
    {
      id: sampleVideosA[0].id,
      snippet: {
        title: sampleVideosA[0].title,
        publishedAt: sampleVideosA[0].publishedAt,
        description: sampleVideosA[0].description,
        tags: sampleVideosA[0].tags,
        categoryId: sampleVideosA[0].categoryId,
        thumbnails: { default: { url: sampleVideosA[0].thumbnailUrl } },
      },
      statistics: {
        viewCount: String(sampleVideosA[0].views),
        likeCount: String(sampleVideosA[0].likes),
        commentCount: String(sampleVideosA[0].comments),
      },
      contentDetails: {
        duration: "PT12M",  // approximate ISO 8601 — does not need to match durationSec exactly
        definition: sampleVideosA[0].definition,
        caption: String(sampleVideosA[0].caption),
      },
      topicDetails: { topicCategories: sampleVideosA[0].topicCategories },
    },
  ],
}

export const sampleYouTubePlaylistItemsResponse = {
  items: sampleVideosA.slice(0, 3).map((v) => ({
    contentDetails: { videoId: v.id },
  })),
}

// ---------------------------------------------------------------------------
// Helper functions for verdict / summary tests
//
// These mirror the orchestrator's inline computation logic.
// They are TEST HELPERS ONLY — not production code.
// ---------------------------------------------------------------------------

export const buildOverview = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): ChannelOverviewData[] => {
  return channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0)
    const avgViewsPerVideo = videos.length > 0 ? totalViews / videos.length : 0
    const topVideo = videos.reduce(
      (best, v) => (v.views > best.views ? { title: v.title, views: v.views } : best),
      { title: "", views: 0 }
    )
    const viewsPerSub = ch.subscriberCount > 0 ? ch.totalViews / ch.subscriberCount : 0
    const viewsPerSubPerVideo = ch.videoCount > 0 ? viewsPerSub / ch.videoCount : 0
    return { channel: ch, avgViewsPerVideo, topVideo, viewsPerSub, viewsPerSubPerVideo }
  })
}

export const buildSubscriberEfficiency = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): SubscriberEfficiencyData => {
  // videosByChannel parameter kept for API symmetry with buildOverview / buildContentFreshness
  void videosByChannel
  return {
    perChannel: channels.map((ch) => {
      const viewsPerSub = ch.subscriberCount > 0 ? ch.totalViews / ch.subscriberCount : 0
      const viewsPerSubPerVideo = ch.videoCount > 0 ? viewsPerSub / ch.videoCount : 0
      return { channelId: ch.id, viewsPerSub, viewsPerSubPerVideo }
    }),
  }
}

export const buildContentFreshness = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>,
  referenceDate: Date
): ContentFreshnessData => {
  return {
    perChannel: channels.map((ch) => {
      const videos = videosByChannel[ch.id] ?? []
      const cutoff = new Date(referenceDate)
      cutoff.setDate(cutoff.getDate() - 30)
      const recent = videos.filter((v) => new Date(v.publishedAt) >= cutoff)
      const allTimeAvgViews =
        videos.length > 0 ? videos.reduce((s, v) => s + v.views, 0) / videos.length : 0
      const recentAvgViews =
        recent.length > 0 ? recent.reduce((s, v) => s + v.views, 0) / recent.length : 0
      const deltaPercent =
        allTimeAvgViews > 0
          ? ((recentAvgViews - allTimeAvgViews) / allTimeAvgViews) * 100
          : 0
      return {
        channelId: ch.id,
        recentCount: recent.length,
        recentAvgViews,
        allTimeAvgViews,
        deltaPercent,
      }
    }),
  }
}
