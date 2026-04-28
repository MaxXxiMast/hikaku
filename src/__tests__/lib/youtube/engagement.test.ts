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

  describe("overlappingMonthly", () => {
    it("only includes months where ALL channels have videos", () => {
      // Default fixtures have no overlapping months (A: 2024-01→2025-01, B: 2025-08→2025-10)
      // so we build a custom result with overlapping data
      const overlapResult = computeEngagement(
        [sampleChannelA, sampleChannelB],
        {
          [sampleChannelA.id]: [
            { ...sampleVideosA[0], publishedAt: "2025-08-15T00:00:00Z" },
            { ...sampleVideosA[1], publishedAt: "2025-09-15T00:00:00Z" },
          ],
          [sampleChannelB.id]: [
            { ...sampleVideosB[0], publishedAt: "2025-08-05T10:00:00Z" },
            { ...sampleVideosB[2], publishedAt: "2025-09-08T11:00:00Z" },
            { ...sampleVideosB[4], publishedAt: "2025-10-10T15:00:00Z" },
          ],
        }
      )
      expect(overlapResult.overlappingMonthly.length).toBeGreaterThan(0)
      const monthsByChannel = new Map<string, Set<string>>()
      overlapResult.monthly.forEach((m) => {
        if (!monthsByChannel.has(m.channelId)) monthsByChannel.set(m.channelId, new Set())
        monthsByChannel.get(m.channelId)!.add(m.month)
      })
      const channelIds = Array.from(monthsByChannel.keys())
      overlapResult.overlappingMonthly.forEach((m) => {
        channelIds.forEach((chId) => {
          expect(monthsByChannel.get(chId)!.has(m.month)).toBe(true)
        })
      })
      // 2025-08 and 2025-09 overlap, 2025-10 does not (only B has it)
      const overlappingMonths = overlapResult.overlappingMonthly.map((m) => m.month)
      expect(overlappingMonths).toContain("2025-08")
      expect(overlappingMonths).toContain("2025-09")
      expect(overlappingMonths).not.toContain("2025-10")
    })

    it("returns empty when no months overlap", () => {
      const noOverlap = computeEngagement(
        [sampleChannelA, sampleChannelB],
        {
          [sampleChannelA.id]: [{ ...sampleVideosA[0], publishedAt: "2022-01-15T00:00:00Z" }],
          [sampleChannelB.id]: [{ ...sampleVideosB[0], publishedAt: "2025-10-15T00:00:00Z" }],
        }
      )
      expect(noOverlap.overlappingMonthly).toHaveLength(0)
    })

    it("has same shape as monthly entries", () => {
      result.overlappingMonthly.forEach((m) => {
        expect(m.month).toMatch(/^\d{4}-\d{2}$/)
        expect(m.engagementRate).toBeGreaterThanOrEqual(0)
        expect(typeof m.views).toBe("number")
      })
    })
  })
})
