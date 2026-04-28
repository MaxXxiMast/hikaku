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

  it("engagement has overlappingMonthly data", () => {
    expect(report.engagement.overlappingMonthly).toBeDefined()
    expect(Array.isArray(report.engagement.overlappingMonthly)).toBe(true)
  })

  it("growth has firstNMonths data", () => {
    expect(report.growth.firstNMonths).toBeDefined()
    expect(report.growth.firstNMonths.n).toBeGreaterThan(0)
    expect(report.growth.firstNMonths.perChannel).toHaveLength(2)
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
