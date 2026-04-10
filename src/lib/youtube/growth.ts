/**
 * growth.ts — Growth trajectory computation.
 *
 * Computes month-on-month viewership aggregation and lifecycle phases per channel.
 * No fetch, no side effects — pure computation.
 *
 * referenceDate is accepted for API compatibility and determinism guarantee.
 * All computation is derived from video data (not relative to referenceDate).
 */

import type { RawChannel, RawVideo, GrowthData, MonthlyData } from "@/lib/youtube/types"
import { safeDivide } from "@/lib/utils"

const detectPhase = (avgViews: number, prevAvgViews: number | null): string => {
  if (prevAvgViews === null) return "Launch"
  const change = safeDivide((avgViews - prevAvgViews) * 100, prevAvgViews)
  if (change > 20) return "Growth"
  if (change > -10) return "Peak"
  if (change > -30) return "Decline"
  return "Plateau"
}

const phaseCharacter = (name: string): string => {
  switch (name) {
    case "Launch":  return "Channel establishing presence"
    case "Growth":  return "Accelerating view counts"
    case "Peak":    return "Stable high performance"
    case "Decline": return "Decreasing engagement"
    default:        return "Consistent output, flat growth"
  }
}

export const computeGrowth = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>,
  _referenceDate: Date
): GrowthData => {
  const monthlyComparison: MonthlyData[] = []

  for (const ch of channels) {
    const videos = videosByChannel[ch.id] ?? []

    // Group by YYYY-MM
    const monthMap = new Map<string, { views: number; likes: number; comments: number; count: number }>()
    for (const v of videos) {
      const month = v.publishedAt.slice(0, 7)
      const existing = monthMap.get(month) ?? { views: 0, likes: 0, comments: 0, count: 0 }
      monthMap.set(month, {
        views: existing.views + v.views,
        likes: existing.likes + v.likes,
        comments: existing.comments + v.comments,
        count: existing.count + 1,
      })
    }

    // Sort months chronologically
    const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))

    let prevViews: number | null = null
    for (const [month, data] of sortedMonths) {
      const momChange = prevViews === null ? null : safeDivide((data.views - prevViews) * 100, prevViews)
      monthlyComparison.push({
        month,
        channelId: ch.id,
        videoCount: data.count,
        totalViews: data.views,
        avgViewsPerVideo: safeDivide(data.views, data.count),
        totalLikes: data.likes,
        totalComments: data.comments,
        momChange,
      })
      prevViews = data.views
    }
  }

  // Lifecycle phases — split each channel's timeline into up to 3 segments (thirds)
  const lifecyclePhases = channels.map((ch) => {
    const chMonths = monthlyComparison
      .filter((m) => m.channelId === ch.id)
      .sort((a, b) => a.month.localeCompare(b.month))

    if (chMonths.length === 0) {
      return { channelId: ch.id, phases: [] }
    }

    const thirdSize = Math.ceil(chMonths.length / 3)
    const segments: MonthlyData[][] = []
    for (let i = 0; i < chMonths.length; i += thirdSize) {
      segments.push(chMonths.slice(i, i + thirdSize))
    }

    const phases = segments.map((seg, idx) => {
      const avgMonthlyViews = seg.reduce((s, m) => s + m.totalViews, 0) / seg.length
      const prevSegAvg =
        idx > 0
          ? segments[idx - 1].reduce((s, m) => s + m.totalViews, 0) / segments[idx - 1].length
          : null
      const name = detectPhase(avgMonthlyViews, prevSegAvg)
      const period = `${seg[0].month} – ${seg[seg.length - 1].month}`
      return { name, period, avgMonthlyViews, character: phaseCharacter(name) }
    })

    return { channelId: ch.id, phases }
  })

  return { monthlyComparison, lifecyclePhases }
}
