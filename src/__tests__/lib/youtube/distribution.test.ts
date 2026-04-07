import { describe, it, expect } from "vitest"
import { computeDistribution } from "@/lib/youtube/distribution"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computeDistribution(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computeDistribution", () => {
  it("computes Gini coefficient between 0 and 1", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.gini).toBeGreaterThanOrEqual(0)
      expect(ch.gini).toBeLessThanOrEqual(1)
    })
  })

  it("WW should have higher Gini than FRA (more hit-driven)", () => {
    const wwGini = result.perChannel.find((c) => c.channelId === sampleChannelA.id)!.gini
    const fraGini = result.perChannel.find((c) => c.channelId === sampleChannelB.id)!.gini
    expect(wwGini).toBeGreaterThan(fraGini)
  })

  it("computes correct percentiles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.percentiles.p10).toBeLessThanOrEqual(ch.percentiles.p25)
      expect(ch.percentiles.p25).toBeLessThanOrEqual(ch.percentiles.p50)
      expect(ch.percentiles.p50).toBeLessThanOrEqual(ch.percentiles.p75)
      expect(ch.percentiles.p75).toBeLessThanOrEqual(ch.percentiles.p90)
    })
  })

  it("computes viral thresholds", () => {
    result.viralThresholds.forEach((vt) => {
      expect(vt.gte1k.pct).toBeGreaterThanOrEqual(0)
      expect(vt.gte1k.pct).toBeLessThanOrEqual(100)
      expect(vt.gte1m.pct).toBeLessThanOrEqual(vt.gte100k.pct)
    })
  })

  it("handles empty video array", () => {
    const empty = computeDistribution([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty.perChannel[0].gini).toBe(0)
    expect(empty.perChannel[0].mean).toBe(0)
  })

  it("returns Gini 0 for single video", () => {
    const single = computeDistribution([sampleChannelA], { [sampleChannelA.id]: [sampleVideosA[0]] })
    expect(single.perChannel[0].gini).toBe(0)
  })
})
