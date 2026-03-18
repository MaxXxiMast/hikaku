import { redis } from "./redis"

export async function checkRateLimit(
  ip: string,
  maxRequests = 10,
  windowSeconds = 3600
): Promise<boolean> {
  const key = `ratelimit:${ip}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  return current <= maxRequests
}
