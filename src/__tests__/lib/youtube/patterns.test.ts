import { describe, it, expect } from "vitest"
import { computePostingPatterns } from "@/lib/youtube/patterns"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

const result = computePostingPatterns(
  [sampleChannelA, sampleChannelB],
  { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
)

describe("computePostingPatterns", () => {
  it("computes upload frequency per channel", () => {
    result.perChannel.forEach((ch) => {
      expect(ch.avgUploadsPerMonth).toBeGreaterThan(0)
      expect(ch.avgGapDays).toBeGreaterThan(0)
    })
  })

  it("computes day-of-week distribution with 7 days", () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const channelDays = result.dayOfWeek.filter((d) => d.channelId === sampleChannelA.id)
    const dayNames = channelDays.map((d) => d.day)
    days.forEach((day) => expect(dayNames).toContain(day))
  })

  it("computes hour-of-day distribution with 24 slots", () => {
    const channelHours = result.hourOfDay.filter((h) => h.channelId === sampleChannelA.id)
    expect(channelHours.length).toBeLessThanOrEqual(24)
    channelHours.forEach((h) => {
      expect(Number(h.hour)).toBeGreaterThanOrEqual(0)
      expect(Number(h.hour)).toBeLessThanOrEqual(23)
    })
  })

  it("assigns duration buckets correctly", () => {
    const validBuckets = ["0-30s", "30-60s", "1-2min", "2-5min", "5-10min", "10-20min", "20min+"]
    result.durationBuckets.forEach((d) => {
      expect(validBuckets).toContain(d.bucket)
    })
  })

  it("handles single video", () => {
    const single = computePostingPatterns(
      [sampleChannelA],
      { [sampleChannelA.id]: [sampleVideosA[0]] }
    )
    expect(single.perChannel[0].avgUploadsPerMonth).toBeGreaterThan(0)
  })
})
