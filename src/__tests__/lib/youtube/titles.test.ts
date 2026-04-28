import { describe, it, expect } from "vitest"
import { computeTitleAnalysis } from "@/lib/youtube/titles"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computeTitleAnalysis(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computeTitleAnalysis", () => {
  it("detects question titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.questionPct).toBeGreaterThanOrEqual(0)
      expect(ch.questionPct).toBeLessThanOrEqual(100)
    })
  })

  it("detects emoji in titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.emojiPct).toBeGreaterThanOrEqual(0)
      expect(ch.emojiPct).toBeLessThanOrEqual(100)
    })
  })

  it("detects numbers/currency in titles", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.numberPct).toBeGreaterThanOrEqual(0)
    })
  })

  it("computes average title length", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.avgTitleLength).toBeGreaterThan(0)
    })
  })

  it("returns top tags sorted by frequency", () => {
    result.topTags.forEach((t) => {
      expect(t.tags.length).toBeLessThanOrEqual(15)
      for (let i = 1; i < t.tags.length; i++) {
        expect(t.tags[i].count).toBeLessThanOrEqual(t.tags[i - 1].count)
      }
    })
  })

  it("handles empty video array", () => {
    const empty = computeTitleAnalysis([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty.perChannel[0].avgTitleLength).toBe(0)
    expect(empty.perChannel[0].questionPct).toBe(0)
  })
})
