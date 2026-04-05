import { describe, it, expect, vi } from "vitest"

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    init: vi.fn(),
  },
}))

describe("Analytics", () => {
  it("exports trackEvent function", async () => {
    const { trackEvent } = await import("@/lib/analytics")
    expect(typeof trackEvent).toBe("function")
  })

  it("trackEvent calls posthog.capture with correct event name", async () => {
    const posthog = (await import("posthog-js")).default
    const { trackEvent } = await import("@/lib/analytics")

    trackEvent({
      event: "comparison_started",
      channels: ["@test"],
      channelCount: 1,
    })

    expect(posthog.capture).toHaveBeenCalledWith(
      "comparison_started",
      expect.objectContaining({ channels: ["@test"], channelCount: 1 })
    )
  })
})
