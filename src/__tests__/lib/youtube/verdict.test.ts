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
    const tieChannels = [
      { ...sampleChannelA, id: "tie-a", totalViews: 1000000, subscriberCount: 10000 },
      { ...sampleChannelB, id: "tie-b", totalViews: 1020000, subscriberCount: 10100 },
    ]
    const tieVideos = {
      "tie-a": sampleVideosA.map((v) => ({ ...v, views: 1000, likes: 20, comments: 2 })),
      "tie-b": sampleVideosB.map((v) => ({ ...v, views: 1010, likes: 21, comments: 2 })),
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
    const tieCount = tieResult.dimensions.filter((d) => d.winnerId === null).length
    expect(tieCount).toBeGreaterThan(5)
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
