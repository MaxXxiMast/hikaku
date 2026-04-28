import type { RawChannel, RawVideo, EngagementData } from "@/lib/youtube/types"
import { engagementRate, median, safeDivide, getDurationBucket } from "@/lib/utils"

export const computeEngagement = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): EngagementData => {
  // Per-channel aggregate stats
  const perChannel = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const totalViews = videos.reduce((s, v) => s + v.views, 0)
    const totalLikes = videos.reduce((s, v) => s + v.likes, 0)
    const totalComments = videos.reduce((s, v) => s + v.comments, 0)
    const perVideoRates = videos.map((v) => engagementRate(v.likes, v.comments, v.views))
    return {
      channelId: ch.id,
      overallRate: safeDivide((totalLikes + totalComments) * 100, totalViews),
      likeRate: safeDivide(totalLikes * 100, totalViews),
      commentRate: safeDivide(totalComments * 100, totalViews),
      medianPerVideoRate: median(perVideoRates),
    }
  })

  // Monthly engagement
  const monthMap = new Map<string, { likes: number; comments: number; views: number; channelId: string }>()
  for (const ch of channels) {
    for (const v of videosByChannel[ch.id] ?? []) {
      const month = v.publishedAt.slice(0, 7) // YYYY-MM
      const key = `${ch.id}::${month}`
      const existing = monthMap.get(key) ?? { likes: 0, comments: 0, views: 0, channelId: ch.id }
      monthMap.set(key, {
        channelId: ch.id,
        likes: existing.likes + v.likes,
        comments: existing.comments + v.comments,
        views: existing.views + v.views,
      })
    }
  }
  const monthly = Array.from(monthMap.entries()).map(([key, m]) => ({
    month: key.split("::")[1],
    channelId: m.channelId,
    engagementRate: safeDivide((m.likes + m.comments) * 100, m.views),
    views: m.views,
  }))

  // Overlapping monthly — only months where ALL channels have at least 1 video
  const monthsPerChannel = new Map<string, Set<string>>()
  for (const ch of channels) {
    const months = new Set<string>()
    for (const v of videosByChannel[ch.id] ?? []) {
      months.add(v.publishedAt.slice(0, 7))
    }
    monthsPerChannel.set(ch.id, months)
  }
  const allChannelMonthSets = Array.from(monthsPerChannel.values())
  const overlappingMonthSet = allChannelMonthSets.length > 0
    ? allChannelMonthSets.reduce((intersection, monthSet) => {
        const result = new Set<string>()
        for (const m of intersection) {
          if (monthSet.has(m)) result.add(m)
        }
        return result
      })
    : new Set<string>()
  const overlappingMonthly = monthly.filter((m) => overlappingMonthSet.has(m.month))

  // Duration bucket engagement
  type BucketAcc = { likes: number; comments: number; views: number; count: number; channelId: string }
  const bucketMap = new Map<string, BucketAcc>()
  for (const ch of channels) {
    for (const v of videosByChannel[ch.id] ?? []) {
      const bucket = getDurationBucket(v.durationSec)
      const key = `${ch.id}::${bucket}`
      const existing = bucketMap.get(key) ?? { likes: 0, comments: 0, views: 0, count: 0, channelId: ch.id }
      bucketMap.set(key, {
        channelId: ch.id,
        likes: existing.likes + v.likes,
        comments: existing.comments + v.comments,
        views: existing.views + v.views,
        count: existing.count + 1,
      })
    }
  }
  const byDuration = Array.from(bucketMap.entries()).map(([key, b]) => ({
    bucket: key.split("::")[1],
    channelId: b.channelId,
    count: b.count,
    avgViews: safeDivide(b.views, b.count),
    engagementRate: safeDivide((b.likes + b.comments) * 100, b.views),
  }))

  // Top engaged (top 5 per channel, min 500 views)
  const topEngaged = channels.flatMap((ch) => {
    const videos = (videosByChannel[ch.id] ?? []).filter((v) => v.views >= 500)
    return videos
      .map((v) => ({ channelId: ch.id, title: v.title, views: v.views, engagementRate: engagementRate(v.likes, v.comments, v.views) }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5)
  })

  return { perChannel, monthly, overlappingMonthly, byDuration, topEngaged }
}
