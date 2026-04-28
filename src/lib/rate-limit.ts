import { redis } from "./redis"

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export const checkRateLimit = async (
  ip: string,
  maxRequests = 10,
  windowSeconds = 3600
): Promise<RateLimitResult> => {
  const key = `ratelimit:${ip}`
  const [current, ttl] = await Promise.all([
    redis.incr(key),
    redis.ttl(key),
  ])

  if (ttl === -1) {
    await redis.expire(key, windowSeconds)
  }

  return {
    allowed: current <= maxRequests,
    retryAfterSeconds: current > maxRequests ? Math.max(ttl, 0) : 0,
  }
}
