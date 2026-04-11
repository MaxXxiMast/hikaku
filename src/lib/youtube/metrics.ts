/**
 * metrics.ts — Metrics orchestrator. Assembles the full ComputedReport from all modules.
 *
 * Three-phase execution:
 *   Inline first: overview, subscriberEfficiency, contentFreshness (needed by Phase 2)
 *   Phase 1 (independent): engagement, categories, distribution, postingPatterns, titleAnalysis, growth
 *   Phase 2 (depends on inline + Phase 1): verdict, executiveSummary
 */

import type {
  RawChannel,
  RawVideo,
  ComputedReport,
  ChannelOverviewData,
  SubscriberEfficiencyData,
  ContentFreshnessData,
} from "@/lib/youtube/types"
import { computeEngagement } from "@/lib/youtube/engagement"
import { computeCategories } from "@/lib/youtube/categories"
import { computeDistribution } from "@/lib/youtube/distribution"
import { computePostingPatterns } from "@/lib/youtube/patterns"
import { computeTitleAnalysis } from "@/lib/youtube/titles"
import { computeGrowth } from "@/lib/youtube/growth"
import { computeVerdict } from "@/lib/youtube/verdict"
import { generateSummary } from "@/lib/youtube/summary"
import { safeDivide } from "@/lib/utils"

export const computeReport = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>,
  options?: { referenceDate?: Date }
): ComputedReport => {
  // Only place new Date() is allowed — at the top of this function
  const referenceDate = options?.referenceDate ?? new Date()

  // --- Inline computations (needed by Phase 2 modules) ---

  const overview: ChannelOverviewData[] = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const totalViews = videos.reduce((s, v) => s + v.views, 0)
    const avgViewsPerVideo = safeDivide(totalViews, videos.length)
    const topVideo = videos.reduce(
      (best, v) => (v.views > best.views ? { title: v.title, views: v.views } : best),
      { title: "", views: 0 }
    )
    const viewsPerSub = safeDivide(ch.totalViews, ch.subscriberCount)
    const viewsPerSubPerVideo = safeDivide(viewsPerSub, ch.videoCount)
    return { channel: ch, avgViewsPerVideo, topVideo, viewsPerSub, viewsPerSubPerVideo }
  })

  const subscriberEfficiency: SubscriberEfficiencyData = {
    perChannel: channels.map((ch) => {
      const viewsPerSub = safeDivide(ch.totalViews, ch.subscriberCount)
      const viewsPerSubPerVideo = safeDivide(viewsPerSub, ch.videoCount)
      return { channelId: ch.id, viewsPerSub, viewsPerSubPerVideo }
    }),
  }

  const cutoff = new Date(referenceDate)
  cutoff.setDate(cutoff.getDate() - 30)
  const contentFreshness: ContentFreshnessData = {
    perChannel: channels.map((ch) => {
      const videos = videosByChannel[ch.id] ?? []
      const recent = videos.filter((v) => new Date(v.publishedAt) >= cutoff)
      const allTimeAvgViews = safeDivide(videos.reduce((s, v) => s + v.views, 0), videos.length)
      const recentAvgViews = safeDivide(recent.reduce((s, v) => s + v.views, 0), recent.length)
      const deltaPercent = allTimeAvgViews > 0
        ? safeDivide((recentAvgViews - allTimeAvgViews) * 100, allTimeAvgViews)
        : 0
      return { channelId: ch.id, recentCount: recent.length, recentAvgViews, allTimeAvgViews, deltaPercent }
    }),
  }

  // --- Phase 1: Independent computation modules ---

  const engagement = computeEngagement(channels, videosByChannel)
  const categories = computeCategories(channels, videosByChannel)
  const distribution = computeDistribution(channels, videosByChannel)
  const postingPatterns = computePostingPatterns(channels, videosByChannel)
  const titleAnalysis = computeTitleAnalysis(channels, videosByChannel)
  const growth = computeGrowth(channels, videosByChannel, referenceDate)

  // --- Phase 2: Depends on Phase 1 + inline ---

  const verdict = computeVerdict(
    channels, overview, engagement, growth, distribution,
    postingPatterns, titleAnalysis, categories, subscriberEfficiency, contentFreshness
  )

  const executiveSummary = generateSummary(
    channels, overview, engagement, growth, distribution, contentFreshness
  )

  return {
    meta: {
      generatedAt: referenceDate.toISOString(),
      channelHandles: channels.map((c) => c.handle),
    },
    overview,
    monthlyViewership: growth.monthlyComparison,  // Section 3 maps to growth output
    engagement,
    growth,
    distribution,
    postingPatterns,
    titleAnalysis,
    categories,
    subscriberEfficiency,
    contentFreshness,
    verdict,
    executiveSummary,
  }
}
