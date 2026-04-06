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
})
