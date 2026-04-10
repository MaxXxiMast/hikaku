import type { RawChannel, RawVideo, PostingPatternsData } from "@/lib/youtube/types"
import { median, safeDivide } from "@/lib/utils"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const getDurationBucket = (durationSec: number): string => {
  if (durationSec <= 30) return "0-30s"
  if (durationSec <= 60) return "30-60s"
  if (durationSec <= 120) return "1-2min"
  if (durationSec <= 300) return "2-5min"
  if (durationSec <= 600) return "5-10min"
  if (durationSec <= 1200) return "10-20min"
  return "20min+"
}

export const computePostingPatterns = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): PostingPatternsData => {
  const perChannel = channels.map((ch) => {
    const videos = (videosByChannel[ch.id] ?? []).slice().sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    )

    if (videos.length === 0) {
      return { channelId: ch.id, avgUploadsPerMonth: 0, avgGapDays: 0, medianGapDays: 0, maxGapDays: 0 }
    }

    // Monthly upload frequency
    const monthSet = new Set(videos.map((v) => v.publishedAt.slice(0, 7)))
    const avgUploadsPerMonth = safeDivide(videos.length, monthSet.size)

    // Gap between consecutive uploads
    const gaps: number[] = []
    for (let i = 1; i < videos.length; i++) {
      const prev = new Date(videos[i - 1].publishedAt).getTime()
      const curr = new Date(videos[i].publishedAt).getTime()
      gaps.push((curr - prev) / (1000 * 60 * 60 * 24))
    }

    const avgGapDays = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0
    const medianGapDays = gaps.length > 0 ? median(gaps) : 0
    const maxGapDays = gaps.length > 0 ? Math.max(...gaps) : 0

    return { channelId: ch.id, avgUploadsPerMonth, avgGapDays, medianGapDays, maxGapDays }
  })

  // Day of week — include ALL 7 days, even with 0 videos
  const dayOfWeek: PostingPatternsData["dayOfWeek"] = []
  for (const ch of channels) {
    const videos = videosByChannel[ch.id] ?? []
    const dayMap = new Map<string, { count: number; views: number }>()
    for (const day of DAY_NAMES) dayMap.set(day, { count: 0, views: 0 })
    for (const v of videos) {
      const day = DAY_NAMES[new Date(v.publishedAt).getUTCDay()]
      const existing = dayMap.get(day)!
      dayMap.set(day, { count: existing.count + 1, views: existing.views + v.views })
    }
    for (const day of DAY_NAMES) {
      const { count, views } = dayMap.get(day)!
      dayOfWeek.push({ day, channelId: ch.id, count, avgViews: safeDivide(views, count) })
    }
  }

  // Hour of day — only include hours with at least 1 video
  const hourOfDay: PostingPatternsData["hourOfDay"] = []
  for (const ch of channels) {
    const videos = videosByChannel[ch.id] ?? []
    const hourMap = new Map<number, { count: number; views: number }>()
    for (const v of videos) {
      const hour = new Date(v.publishedAt).getUTCHours()
      const existing = hourMap.get(hour) ?? { count: 0, views: 0 }
      hourMap.set(hour, { count: existing.count + 1, views: existing.views + v.views })
    }
    for (const [hour, { count, views }] of hourMap.entries()) {
      hourOfDay.push({ hour: String(hour), channelId: ch.id, count, avgViews: safeDivide(views, count) })
    }
  }

  // Duration buckets — only include buckets with at least 1 video
  const durationBuckets: PostingPatternsData["durationBuckets"] = []
  for (const ch of channels) {
    const videos = videosByChannel[ch.id] ?? []
    type BucketAcc = { count: number; views: number; likes: number; comments: number }
    const bucketMap = new Map<string, BucketAcc>()
    for (const v of videos) {
      const bucket = getDurationBucket(v.durationSec)
      const existing = bucketMap.get(bucket) ?? { count: 0, views: 0, likes: 0, comments: 0 }
      bucketMap.set(bucket, {
        count: existing.count + 1,
        views: existing.views + v.views,
        likes: existing.likes + v.likes,
        comments: existing.comments + v.comments,
      })
    }
    for (const [bucket, b] of bucketMap.entries()) {
      durationBuckets.push({
        bucket,
        channelId: ch.id,
        count: b.count,
        avgViews: safeDivide(b.views, b.count),
        engagementRate: safeDivide((b.likes + b.comments) * 100, b.views),
      })
    }
  }

  return { perChannel, dayOfWeek, hourOfDay, durationBuckets }
}
