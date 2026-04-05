import { describe, it, expect } from "vitest"
import { compareSchema } from "@/lib/validations"

describe("compareSchema", () => {
  it("accepts valid input with 2 channels", () => {
    const result = compareSchema.safeParse({
      channels: ["@WintWealthYT", "@FixedReturnsAcademy"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts valid input with 4 channels", () => {
    const result = compareSchema.safeParse({
      channels: ["@a", "@b", "@c", "@d"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts handles without @ prefix", () => {
    const result = compareSchema.safeParse({
      channels: ["WintWealthYT", "FixedReturnsAcademy"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects fewer than 2 channels", () => {
    const result = compareSchema.safeParse({ channels: ["@only_one"] })
    expect(result.success).toBe(false)
  })

  it("rejects more than 4 channels", () => {
    const result = compareSchema.safeParse({
      channels: ["@a", "@b", "@c", "@d", "@e"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid handle characters", () => {
    const result = compareSchema.safeParse({
      channels: ["@valid", "@inv alid"],
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional apiKey", () => {
    const result = compareSchema.safeParse({
      channels: ["@a", "@b"],
      apiKey: "AIzaSy123",
    })
    expect(result.success).toBe(true)
  })
})
