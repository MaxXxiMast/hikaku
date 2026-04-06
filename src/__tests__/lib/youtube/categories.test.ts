import { describe, it, expect } from "vitest"
import { classifyVideo, computeCategories } from "@/lib/youtube/categories"
import { sampleChannelA, sampleChannelB, sampleVideosA, sampleVideosB } from "./fixtures"

describe("classifyVideo", () => {
  it("classifies taxation videos", () => {
    expect(classifyVideo("How Are Bonds Taxed in India?")).toBe("Taxation")
  })
  it("classifies income strategy", () => {
    expect(classifyVideo("Build Monthly Passive Income with Bond Ladder")).toBe("Income Strategy")
  })
  it("classifies educational", () => {
    expect(classifyVideo("What Are Bonds? Beginner's Guide")).toBe("Educational")
  })
  it("classifies myths/mistakes", () => {
    expect(classifyVideo("5 Mistakes Every Bond Investor Makes")).toBe("Myths/Mistakes")
  })
  it("classifies comparison", () => {
    expect(classifyVideo("FD vs Bonds: Which is Better?")).toBe("Comparison")
  })
  it("classifies shorts", () => {
    expect(classifyVideo("Bond Basics #shorts")).toBe("Shorts")
  })
  it("falls back to Other", () => {
    expect(classifyVideo("Random Unrelated Title")).toBe("Other")
  })
  it("is case-insensitive", () => {
    expect(classifyVideo("TAX SAVING TIPS")).toBe("Taxation")
  })
})

describe("computeCategories", () => {
  const result = computeCategories(
    [sampleChannelA, sampleChannelB],
    { [sampleChannelA.id]: sampleVideosA, [sampleChannelB.id]: sampleVideosB }
  )

  it("returns CategoryData[] with per-category stats", () => {
    expect(result.length).toBeGreaterThan(0)
    result.forEach((cat) => {
      expect(cat.name).toBeTruthy()
      expect(cat.videoCount).toBeGreaterThan(0)
      expect(cat.avgViews).toBeGreaterThanOrEqual(0)
    })
  })

  it("includes topVideo per category", () => {
    result.forEach((cat) => {
      expect(cat.topVideo.title).toBeTruthy()
      expect(cat.topVideo.views).toBeGreaterThanOrEqual(0)
    })
  })

  it("handles empty video array", () => {
    const empty = computeCategories([sampleChannelA], { [sampleChannelA.id]: [] })
    expect(empty).toHaveLength(0)
  })

  it("classifies all as Other when no keywords match", () => {
    const generic = [{ ...sampleVideosA[0], title: "Random Thoughts on Life" }]
    const r = computeCategories([sampleChannelA], { [sampleChannelA.id]: generic })
    expect(r.every((c) => c.name === "Other")).toBe(true)
  })
})
