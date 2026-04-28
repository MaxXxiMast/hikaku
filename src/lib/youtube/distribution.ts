import type { RawChannel, RawVideo, DistributionData } from "@/lib/youtube/types"
import { computeGini, median, percentile, safeDivide } from "@/lib/utils"

export const computeDistribution = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): DistributionData => {
  const perChannel = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const views = videos.map((v) => v.views)

    if (views.length === 0) {
      return {
        channelId: ch.id,
        mean: 0, median: 0, meanMedianRatio: 0,
        gini: 0, top10PctShare: 0,
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
      }
    }

    const mean = views.reduce((s, v) => s + v, 0) / views.length
    const med = median(views)
    const gini = computeGini(views)
    const sorted = [...views].sort((a, b) => b - a)
    const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1))
    const top10Views = sorted.slice(0, top10Count).reduce((s, v) => s + v, 0)
    const totalViews = views.reduce((s, v) => s + v, 0)
    const top10PctShare = safeDivide(top10Views * 100, totalViews)

    return {
      channelId: ch.id,
      mean,
      median: med,
      meanMedianRatio: safeDivide(mean, med),
      gini,
      top10PctShare,
      percentiles: {
        p10: percentile(views, 10),
        p25: percentile(views, 25),
        p50: percentile(views, 50),
        p75: percentile(views, 75),
        p90: percentile(views, 90),
        p95: percentile(views, 95),
      },
    }
  })

  const viralThresholds = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const total = videos.length
    const count = (threshold: number) => videos.filter((v) => v.views >= threshold).length
    const pct = (n: number) => safeDivide(n * 100, total)
    const c1k = count(1000)
    const c10k = count(10000)
    const c100k = count(100000)
    const c1m = count(1000000)
    return {
      channelId: ch.id,
      gte1k: { count: c1k, total, pct: pct(c1k) },
      gte10k: { count: c10k, total, pct: pct(c10k) },
      gte100k: { count: c100k, total, pct: pct(c100k) },
      gte1m: { count: c1m, total, pct: pct(c1m) },
    }
  })

  return { perChannel, viralThresholds }
}
