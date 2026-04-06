import { describe, it, expect } from "vitest"
import {
  formatNumber,
  median,
  percentile,
  computeGini,
  parseDuration,
  engagementRate,
  safeDivide,
} from "@/lib/utils"

describe("formatNumber", () => {
  it("formats millions", () => expect(formatNumber(1500000)).toBe("1.50M"))
  it("formats thousands", () => expect(formatNumber(45000)).toBe("45.0K"))
  it("formats small numbers", () => expect(formatNumber(999)).toBe("999"))
  it("handles zero", () => expect(formatNumber(0)).toBe("0"))
})

describe("median", () => {
  it("returns median of odd array", () => expect(median([1, 3, 5])).toBe(3))
  it("returns median of even array", () => expect(median([1, 2, 3, 4])).toBe(2.5))
  it("handles single element", () => expect(median([42])).toBe(42))
  it("handles empty array", () => expect(median([])).toBe(0))
  it("does not mutate input", () => {
    const arr = [5, 1, 3]
    median(arr)
    expect(arr).toEqual([5, 1, 3])
  })
})

describe("percentile", () => {
  it("returns p50", () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30)
  })
  it("returns p90", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(arr, 90)).toBe(91)
  })
  it("handles empty array", () => expect(percentile([], 50)).toBe(0))
})

describe("computeGini", () => {
  it("returns 0 for equal values", () => {
    expect(computeGini([100, 100, 100, 100])).toBeCloseTo(0, 1)
  })
  it("returns high value for unequal distribution", () => {
    expect(computeGini([1, 1, 1, 1000])).toBeGreaterThan(0.5)
  })
  it("handles empty array", () => expect(computeGini([])).toBe(0))
  it("handles single element", () => expect(computeGini([42])).toBe(0))
})

describe("parseDuration", () => {
  it("parses hours, minutes, seconds", () => {
    expect(parseDuration("PT1H2M3S")).toBe(3723)
  })
  it("parses minutes and seconds", () => {
    expect(parseDuration("PT5M30S")).toBe(330)
  })
  it("parses seconds only", () => {
    expect(parseDuration("PT45S")).toBe(45)
  })
  it("handles zero duration", () => {
    expect(parseDuration("PT0S")).toBe(0)
  })
  it("handles malformed input", () => {
    expect(parseDuration("invalid")).toBe(0)
  })
})

describe("engagementRate", () => {
  it("computes correct rate", () => {
    expect(engagementRate(50, 10, 1000)).toBeCloseTo(6.0)
  })
  it("handles zero views", () => {
    expect(engagementRate(10, 5, 0)).toBe(0)
  })
})

describe("safeDivide", () => {
  it("divides normally", () => expect(safeDivide(10, 2)).toBe(5))
  it("returns 0 for zero divisor", () => expect(safeDivide(10, 0)).toBe(0))
})
