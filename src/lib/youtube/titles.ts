/**
 * titles.ts — Title & SEO analysis computation module.
 *
 * Computes per-channel title pattern metrics (question, emoji, number detection,
 * avg title length) and top tag frequency across all videos.
 *
 * Pure computation — no fetch, no side effects.
 */

import type { RawChannel, RawVideo, TitleAnalysisData } from "@/lib/youtube/types"
import { safeDivide } from "@/lib/utils"

// Emoji detection — Unicode property escape (spec 8.8)
const hasEmoji = (s: string): boolean => /\p{Emoji}/u.test(s)

const hasNumber = (s: string): boolean => /\d|₹/.test(s)

const hasQuestion = (s: string): boolean => s.includes("?")

const avgViews = (arr: RawVideo[]): number =>
  arr.length > 0 ? arr.reduce((sum, v) => sum + v.views, 0) / arr.length : 0

export const computeTitleAnalysis = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): TitleAnalysisData => {
  const perChannel = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []

    if (videos.length === 0) {
      return {
        channelId: ch.id,
        avgTitleLength: 0,
        questionPct: 0,
        questionAvgViews: 0,
        emojiPct: 0,
        emojiAvgViews: 0,
        numberPct: 0,
        numberAvgViews: 0,
      }
    }

    const n = videos.length
    const questionVideos = videos.filter((v) => hasQuestion(v.title))
    const emojiVideos = videos.filter((v) => hasEmoji(v.title))
    const numberVideos = videos.filter((v) => hasNumber(v.title))

    return {
      channelId: ch.id,
      avgTitleLength: videos.reduce((sum, v) => sum + v.title.length, 0) / n,
      questionPct: safeDivide(questionVideos.length * 100, n),
      questionAvgViews: avgViews(questionVideos),
      emojiPct: safeDivide(emojiVideos.length * 100, n),
      emojiAvgViews: avgViews(emojiVideos),
      numberPct: safeDivide(numberVideos.length * 100, n),
      numberAvgViews: avgViews(numberVideos),
    }
  })

  const topTags = channels.map((ch) => {
    const videos = videosByChannel[ch.id] ?? []
    const tagCount = new Map<string, number>()

    for (const v of videos) {
      for (const tag of v.tags ?? []) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
      }
    }

    const tags = Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    return { channelId: ch.id, tags }
  })

  return { perChannel, topTags }
}
