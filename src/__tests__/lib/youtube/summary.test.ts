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
