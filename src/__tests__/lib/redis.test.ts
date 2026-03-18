import { describe, it, expect, vi } from "vitest"

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
    })),
  },
}))

describe("Redis client", () => {
  it("exports a redis instance", async () => {
    const { redis } = await import("@/lib/redis")
    expect(redis).toBeDefined()
  })

  it("exports cache helper functions", async () => {
    const { cacheReport, getCachedReport } = await import("@/lib/redis")
    expect(typeof cacheReport).toBe("function")
    expect(typeof getCachedReport).toBe("function")
  })
})
