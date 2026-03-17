import { Redis } from "@upstash/redis"

export const redis = Redis.fromEnv()

const CACHE_TTL = 4 * 60 * 60 // 4 hours in seconds

export async function cacheReport(
  reportId: string,
  computed: unknown
): Promise<void> {
  await redis.set(`report:${reportId}:computed`, JSON.stringify(computed), {
    ex: CACHE_TTL,
  })
}

export async function getCachedReport(
  reportId: string
): Promise<unknown | null> {
  const data = await redis.get<string>(`report:${reportId}:computed`)
  if (!data) return null
  return typeof data === "string" ? JSON.parse(data) : data
}
