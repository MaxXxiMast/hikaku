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
