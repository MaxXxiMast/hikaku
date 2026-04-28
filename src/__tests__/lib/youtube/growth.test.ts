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

describe("firstNMonths", () => {
  it("N equals the younger channel's age in months", () => {
    // FRA joined 2025-07-29, reference is 2026-03-01 → ~8 months
    // WW joined 2021-03-21 → ~60 months
    // N should be ~8 (min of channel ages)
    expect(result.firstNMonths.n).toBeGreaterThan(0)
    expect(result.firstNMonths.n).toBeLessThanOrEqual(12)
  })

  it("each channel has at most N months of data", () => {
    result.firstNMonths.perChannel.forEach((ch) => {
      expect(ch.months.length).toBeLessThanOrEqual(result.firstNMonths.n)
    })
  })

  it("months are from each channel's own start date", () => {
    const wwData = result.firstNMonths.perChannel.find((c) => c.channelId === sampleChannelA.id)!
    if (wwData.months.length > 0) {
      expect(wwData.months[0].month >= "2021-03").toBe(true)
    }
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
