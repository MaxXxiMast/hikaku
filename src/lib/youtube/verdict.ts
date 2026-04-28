/**
 * verdict.ts — Head-to-head verdict computation across 15 dimensions.
 *
 * Compares channels pairwise using threshold-based tie detection (< 5% difference = tie).
 * Margin classification: Slight < 15%, Moderate < 50%, Strong ≥ 50%.
 */

import type {
  RawChannel,
  ChannelOverviewData,
  EngagementData,
  GrowthData,
  DistributionData,
  PostingPatternsData,
  TitleAnalysisData,
  CategoryData,
  SubscriberEfficiencyData,
  ContentFreshnessData,
  VerdictData,
  VerdictDimension,
} from "@/lib/youtube/types"
import { safeDivide } from "@/lib/utils"

const TIE_THRESHOLD = 0.05    // < 5% difference = tie
const SLIGHT_THRESHOLD = 0.15
const MODERATE_THRESHOLD = 0.50

const scoreDimension = (
  dimension: string,
  channelIds: string[],
  scores: number[],
  notes: string
): VerdictDimension => {
  if (scores.length < 2 || channelIds.length < 2) {
    return { dimension, winnerId: null, margin: "", notes }
  }

  // Find the highest and second-highest scores
  const indexed = scores.map((s, i) => ({ score: s, id: channelIds[i] }))
  indexed.sort((a, b) => b.score - a.score)

  const highest = indexed[0]
  const secondHighest = indexed[1]

  if (highest.score === 0) return { dimension, winnerId: null, margin: "", notes }
  const diff = Math.abs(highest.score - secondHighest.score) / highest.score
  if (diff < TIE_THRESHOLD) return { dimension, winnerId: null, margin: "", notes }

  const margin = diff < SLIGHT_THRESHOLD ? "Slight" : diff < MODERATE_THRESHOLD ? "Moderate" : "Strong"
  return { dimension, winnerId: highest.id, margin, notes }
}

export const computeVerdict = (
  channels: RawChannel[],
  overview: ChannelOverviewData[],
  engagement: EngagementData,
  growth: GrowthData,
  distribution: DistributionData,
  postingPatterns: PostingPatternsData,
  titleAnalysis: TitleAnalysisData,
  categories: CategoryData[],
  subscriberEfficiency: SubscriberEfficiencyData,
  contentFreshness: ContentFreshnessData
): VerdictData => {
  const ids = channels.map((c) => c.id)

  // 1. Scale & Reach — total views (dominant signal for reach)
  const scaleScores = ids.map((id) => {
    const ov = overview.find((o) => o.channel.id === id)!
    return ov.channel.totalViews
  })

  // 2. Engagement Quality — median per-video engagement rate
  const engScores = ids.map((id) => {
    const ch = engagement.perChannel.find((p) => p.channelId === id)
    return ch?.medianPerVideoRate ?? 0
  })

  // 3. Content-Product Fit — top category concentration (top category videoCount / total)
  const fitScores = ids.map((id) => {
    const chCats = categories.filter((c) => c.channelId === id)
    if (chCats.length === 0) return 0
    const topCount = Math.max(...chCats.map((c) => c.videoCount))
    const total = chCats.reduce((s, c) => s + c.videoCount, 0)
    return safeDivide(topCount, total)
  })

  // 4. Growth Trajectory — average MoM view change (positive = better)
  const growthScores = ids.map((id) => {
    const months = growth.monthlyComparison.filter((m) => m.channelId === id && m.momChange !== null)
    if (months.length === 0) return 0
    const avg = months.reduce((s, m) => s + (m.momChange ?? 0), 0) / months.length
    return avg
  })

  // 5. Upload Strategy — avg uploads per month (consistency signal)
  const uploadScores = ids.map((id) => {
    const ch = postingPatterns.perChannel.find((p) => p.channelId === id)
    return ch?.avgUploadsPerMonth ?? 0
  })

  // 6. SEO / Discoverability — tag breadth (number of unique tags)
  const seoScores = ids.map((id) => {
    const chTags = titleAnalysis.topTags.find((t) => t.channelId === id)
    return chTags?.tags.length ?? 0
  })

  // 7. Subscriber Efficiency — views per subscriber per video
  const subEffScores = ids.map((id) => {
    const ch = subscriberEfficiency.perChannel.find((p) => p.channelId === id)
    return ch?.viewsPerSubPerVideo ?? 0
  })

  // 8. Duration Strategy — avg views in best-performing duration bucket
  const durScores = ids.map((id) => {
    const buckets = postingPatterns.durationBuckets.filter((b) => b.channelId === id)
    if (buckets.length === 0) return 0
    return Math.max(...buckets.map((b) => b.avgViews))
  })

  // 9. Title Optimization — question and number title pattern effectiveness
  const titleScores = ids.map((id) => {
    const ch = titleAnalysis.perChannel.find((c) => c.channelId === id)
    if (!ch) return 0
    return (ch.questionPct / 100) * ch.questionAvgViews + (ch.numberPct / 100) * ch.numberAvgViews
  })

  // 10. Posting Optimization — best day average views (peak performance indicator)
  const postOptScores = ids.map((id) => {
    const days = postingPatterns.dayOfWeek.filter((d) => d.channelId === id && d.count > 0)
    if (days.length === 0) return 0
    return Math.max(...days.map((d) => d.avgViews))
  })

  // 11. Content Freshness — deltaPercent (recent vs all-time), shifted to positive for fair comparison
  const rawFreshnessScores = ids.map((id) => {
    const ch = contentFreshness.perChannel.find((c) => c.channelId === id)
    return ch?.deltaPercent ?? 0
  })
  const minFreshness = Math.min(...rawFreshnessScores)
  const adjustedFreshness = rawFreshnessScores.map((s) => s - minFreshness)

  // 12. Brand Building — upload gap consistency (avgGapDays / maxGapDays, closer to 1 = consistent)
  const brandScores = ids.map((id) => {
    const ch = postingPatterns.perChannel.find((p) => p.channelId === id)
    if (!ch || ch.maxGapDays === 0) return 0
    return safeDivide(ch.avgGapDays, ch.maxGapDays)
  })

  // 13. Viral Potential — 100K+ view rate + top-10% view share
  const viralScores = ids.map((id) => {
    const vt = distribution.viralThresholds.find((v) => v.channelId === id)
    const pc = distribution.perChannel.find((p) => p.channelId === id)
    return (vt?.gte100k.pct ?? 0) + (pc?.top10PctShare ?? 0)
  })

  // 14. Audience Depth — comment rate as audience depth proxy
  const depthScores = ids.map((id) => {
    const ch = engagement.perChannel.find((p) => p.channelId === id)
    return ch?.commentRate ?? 0
  })

  // 15. Long-term Defensibility — niche concentration + comment rate (depth signals)
  const defScores = ids.map((id) => {
    const chCats = categories.filter((c) => c.channelId === id)
    const total = chCats.reduce((s, c) => s + c.videoCount, 0)
    const topCount = chCats.length > 0 ? Math.max(...chCats.map((c) => c.videoCount)) : 0
    const concentration = safeDivide(topCount, total)
    const ch = engagement.perChannel.find((p) => p.channelId === id)
    const commentRate = ch?.commentRate ?? 0
    return concentration + commentRate / 100
  })

  const dimensions: VerdictDimension[] = [
    scoreDimension("Scale & Reach", ids, scaleScores, "Based on total views across all videos"),
    scoreDimension("Engagement Quality", ids, engScores, "Median per-video engagement rate"),
    scoreDimension("Content-Product Fit", ids, fitScores, "Concentration in top content category"),
    scoreDimension("Growth Trajectory", ids, growthScores, "Average month-over-month view change"),
    scoreDimension("Upload Strategy", ids, uploadScores, "Average uploads per month"),
    scoreDimension("SEO / Discoverability", ids, seoScores, "Tag breadth across video library"),
    scoreDimension("Subscriber Efficiency", ids, subEffScores, "Views per subscriber per video"),
    scoreDimension("Duration Strategy", ids, durScores, "Best performing duration bucket avg views"),
    scoreDimension("Title Optimization", ids, titleScores, "Question and number title pattern effectiveness"),
    scoreDimension("Posting Optimization", ids, postOptScores, "Best day peak average views"),
    scoreDimension("Content Freshness", ids, adjustedFreshness, "Recent vs all-time view performance delta"),
    scoreDimension("Brand Building", ids, brandScores, "Upload schedule consistency"),
    scoreDimension("Viral Potential", ids, viralScores, "100K+ view rate and top-10% view share"),
    scoreDimension("Audience Depth", ids, depthScores, "Comment rate as audience depth proxy"),
    scoreDimension("Long-term Defensibility", ids, defScores, "Niche concentration and audience depth"),
  ]

  // Summary: count wins per channel
  const winCounts = Object.fromEntries(ids.map((id) => [id, 0]))
  for (const d of dimensions) {
    if (d.winnerId) winCounts[d.winnerId] = (winCounts[d.winnerId] ?? 0) + 1
  }
  const winnerEntry = Object.entries(winCounts).sort(([, a], [, b]) => b - a)[0]
  const winnerId = winnerEntry?.[0]
  const winnerChannel = channels.find((c) => c.id === winnerId)
  const winnerWins = winnerEntry?.[1] ?? 0
  const totalNonTies = dimensions.filter((d) => d.winnerId !== null).length

  const summary = winnerChannel
    ? `${winnerChannel.title} leads on ${winnerWins} of ${totalNonTies} scored dimensions. ` +
      `Scale & Reach, Viral Potential, and Engagement Quality are the most differentiating factors.`
    : `The channels are closely matched across most dimensions.`

  return { dimensions, summary }
}
