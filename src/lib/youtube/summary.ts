/**
 * summary.ts — Template-based executive summary generation.
 *
 * Produces a 2-4 sentence natural language summary comparing channels
 * across scale, engagement, trend, and viral potential.
 *
 * V1: Pure template generation — no LLM required.
 * Handles 2-4 channels. Single responsibility: string output only.
 */

import type {
  RawChannel,
  ChannelOverviewData,
  EngagementData,
  GrowthData,
  DistributionData,
  ContentFreshnessData,
} from "@/lib/youtube/types"
import { formatNumber } from "@/lib/utils"

export const generateSummary = (
  channels: RawChannel[],
  overview: ChannelOverviewData[],
  engagement: EngagementData,
  growth: GrowthData,
  distribution: DistributionData,
  contentFreshness: ContentFreshnessData
): string => {
  if (channels.length === 0) return ""

  // Suppress unused-variable warnings for parameters used only in multi-channel path
  void overview
  void contentFreshness

  // Find the channel with the highest total views (scale leader)
  const scaleLeader = channels.reduce((best, ch) =>
    ch.totalViews > best.totalViews ? ch : best
  )

  // Find the channel with the highest median engagement rate
  const engagementLeader = channels.reduce((best, ch) => {
    const rate = engagement.perChannel.find((p) => p.channelId === ch.id)?.medianPerVideoRate ?? 0
    const bestRate = engagement.perChannel.find((p) => p.channelId === best.id)?.medianPerVideoRate ?? 0
    return rate > bestRate ? ch : best
  })

  // Trend observation: average recent MoM change for the scale leader
  const scaleLeaderMonths = growth.monthlyComparison
    .filter((m) => m.channelId === scaleLeader.id && m.momChange !== null)
    .sort((a, b) => a.month.localeCompare(b.month))
  const recentMoM = scaleLeaderMonths.slice(-3)
  const avgRecentMoM =
    recentMoM.length > 0
      ? recentMoM.reduce((s, m) => s + (m.momChange ?? 0), 0) / recentMoM.length
      : 0
  const trendDesc =
    avgRecentMoM > 10 ? "growing rapidly"
    : avgRecentMoM > 0 ? "on an upward trend"
    : avgRecentMoM > -10 ? "relatively stable"
    : "showing declining views"

  // Viral potential: channel with highest % of videos reaching 100K+ views
  const viralLeader = channels.reduce((best, ch) => {
    const vt = distribution.viralThresholds.find((v) => v.channelId === ch.id)
    const bestVt = distribution.viralThresholds.find((v) => v.channelId === best.id)
    return (vt?.gte100k.pct ?? 0) > (bestVt?.gte100k.pct ?? 0) ? ch : best
  })

  const engLeaderRate =
    engagement.perChannel.find((p) => p.channelId === engagementLeader.id)?.medianPerVideoRate ?? 0

  // --- 2-channel template ---
  if (channels.length === 2) {
    const other = channels.find((c) => c.id !== scaleLeader.id)!
    const parts: string[] = []

    if (scaleLeader.id !== engagementLeader.id) {
      parts.push(
        `${scaleLeader.title} dominates on scale (${formatNumber(scaleLeader.totalViews)} total views) ` +
          `but ${engagementLeader.title} wins on engagement quality (${engLeaderRate.toFixed(2)}% median engagement rate).`
      )
    } else {
      parts.push(
        `${scaleLeader.title} leads on both scale (${formatNumber(scaleLeader.totalViews)} total views) ` +
          `and engagement (${engLeaderRate.toFixed(2)}% median engagement rate), ` +
          `while ${other.title} is still building its library.`
      )
    }

    parts.push(`${scaleLeader.title} is ${trendDesc} based on recent month-over-month data.`)

    if (viralLeader.id !== scaleLeader.id) {
      parts.push(`${viralLeader.title} shows stronger viral potential with more 100K+ view videos.`)
    } else {
      parts.push(
        `${scaleLeader.title} also leads on viral potential with higher view concentration in top videos.`
      )
    }

    return parts.join(" ")
  }

  // --- 3-4 channel template ---
  const rankedByViews = [...channels].sort((a, b) => b.totalViews - a.totalViews)
  const leaders = rankedByViews
    .slice(0, 2)
    .map((c) => c.title)
    .join(" and ")
  return (
    `Comparing ${channels.length} channels: ${leaders} lead on scale. ` +
    `${engagementLeader.title} wins on engagement quality (${engLeaderRate.toFixed(2)}% median rate). ` +
    `Overall views and engagement rates vary significantly across all channels.`
  )
}
