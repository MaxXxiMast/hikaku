import { describe, it, expect } from "vitest"
import { compareSchema, channelHandleSchema } from "@/lib/validations"

describe("channelHandleSchema (hardened)", () => {
  it("accepts valid handle with @", () => {
    expect(channelHandleSchema.safeParse("@WintWealthYT").success).toBe(true)
  })

  it("accepts valid handle without @", () => {
    expect(channelHandleSchema.safeParse("WintWealthYT").success).toBe(true)
  })

  it("trims whitespace", () => {
    const result = channelHandleSchema.safeParse("  @WintWealthYT  ")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("@WintWealthYT")
  })

  it("rejects handles longer than 30 chars", () => {
    expect(channelHandleSchema.safeParse("@" + "a".repeat(31)).success).toBe(false)
  })

  it("rejects empty string", () => {
    expect(channelHandleSchema.safeParse("").success).toBe(false)
  })

  it("rejects special characters", () => {
    expect(channelHandleSchema.safeParse("@test<script>").success).toBe(false)
  })
})

describe("compareSchema (hardened)", () => {
  it("accepts 2 valid handles", () => {
    const result = compareSchema.safeParse({ channels: ["@foo", "@bar"] })
    expect(result.success).toBe(true)
  })

  it("rejects duplicate handles", () => {
    const result = compareSchema.safeParse({ channels: ["@foo", "@foo"] })
    expect(result.success).toBe(false)
  })

  it("rejects more than 2 channels in V1", () => {
    const result = compareSchema.safeParse({ channels: ["@a", "@b", "@c"] })
    expect(result.success).toBe(false)
  })

  it("rejects fewer than 2 channels", () => {
    const result = compareSchema.safeParse({ channels: ["@only"] })
    expect(result.success).toBe(false)
  })

  it("validates API key format when provided", () => {
    const valid = compareSchema.safeParse({
      channels: ["@a", "@b"],
      apiKey: "AIzaSyA1234567890abcdefghijklmnopqrstuv",
    })
    expect(valid.success).toBe(true)

    const invalid = compareSchema.safeParse({
      channels: ["@a", "@b"],
      apiKey: "not-a-valid-key",
    })
    expect(invalid.success).toBe(false)
  })

  it("accepts missing API key", () => {
    const result = compareSchema.safeParse({ channels: ["@a", "@b"] })
    expect(result.success).toBe(true)
  })
})
