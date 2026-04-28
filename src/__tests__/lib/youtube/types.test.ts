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
