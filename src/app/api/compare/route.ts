import { NextRequest, NextResponse } from "next/server"
import { compareSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { resolveChannel, fetchAllVideos } from "@/lib/youtube/client"
import { computeReport } from "@/lib/youtube/metrics"
import { cacheReport } from "@/lib/redis"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../../convex/_generated/api"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export const POST = async (req: NextRequest) => {
  // CSRF check
  const origin = req.headers.get("origin")
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
  ].filter(Boolean)
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse + validate input
  const body = await req.json().catch(() => null)
  const parsed = compareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { channels: handles, apiKey } = parsed.data
  const youtubeApiKey = apiKey ?? process.env.YOUTUBE_API_KEY
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "No YouTube API key available" },
      { status: 503 }
    )
  }

  // Rate limit
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rateLimit = await checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes.` },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  try {
    // Resolve all channels (atomic — all must succeed)
    const resolvedChannels: RawChannel[] = []
    for (const handle of handles) {
      const channel = await resolveChannel(handle, youtubeApiKey)
      resolvedChannels.push(channel)
    }

    // Fetch all videos per channel (no since filter — section-level windowing)
    const videosByChannel: Record<string, RawVideo[]> = {}
    for (const channel of resolvedChannels) {
      const videos = await fetchAllVideos(channel.uploadsPlaylistId, youtubeApiKey)
      videosByChannel[channel.id] = videos
    }

    // Compute full report
    const referenceDate = new Date()
    const report = computeReport(resolvedChannels, videosByChannel, { referenceDate })

    // Store in Convex (graceful — don't block response on failure)
    let reportId: string | null = null
    try {
      reportId = await convex.mutation(api.reports.create, {
        channelHandles: resolvedChannels.map((c) => c.handle),
        raw: {
          channels: resolvedChannels as unknown[],
          videos: Object.values(videosByChannel).flat() as unknown[],
        },
        computed: report as unknown,
      })
    } catch (err) {
      console.error("Convex storage failed:", err)
    }

    // Cache in Redis (graceful)
    if (reportId) {
      try {
        await cacheReport(reportId, report)
      } catch (err) {
        console.error("Redis cache failed:", err)
      }
    }

    return NextResponse.json({ reportId, data: report })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Comparison failed"

    if (message.includes("Channel not found")) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes("Quota exceeded") || message.includes("YouTube API error (403)")) {
      return NextResponse.json(
        { error: "YouTube API daily limit reached. Try again tomorrow or provide your own API key." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Comparison failed. Please try again." },
      { status: 500 }
    )
  }
}
