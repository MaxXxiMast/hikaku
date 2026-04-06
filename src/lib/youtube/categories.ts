/**
 * categories.ts — Keyword-based video category classification.
 *
 * Classifies RawVideo titles into finance content categories using a
 * priority-ordered keyword table. First match wins; falls back to "Other".
 *
 * Scope: V1 — finance/bond-channel focused keyword set.
 * No ML, no YouTube category IDs — title-only classification.
 */

import type { RawChannel, RawVideo, CategoryData } from "@/lib/youtube/types"
import { safeDivide } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Category keyword table — checked in order, first match wins
// ---------------------------------------------------------------------------

const CATEGORIES: { name: string; keywords: string[] }[] = [
  { name: "Shorts", keywords: ["#", "short"] },
  { name: "Taxation", keywords: ["tax", "taxed", "taxation"] },
  { name: "Income Strategy", keywords: ["passive income", "monthly income", "bond ladder"] },
  { name: "FD Comparison", keywords: ["fixed deposit"] },
  { name: "Risk/Safety", keywords: ["credit rating", "safe"] },
  { name: "Bond Basics", keywords: ["ytm", "coupon", "yield", "face value"] },
  { name: "Asset Comparison", keywords: ["debt fund", "mutual fund", "stock", "equity", "gold", "real estate"] },
  { name: "Macro/RBI", keywords: ["rbi", "repo", "interest rate", "rate cut"] },
  { name: "Bond Types", keywords: ["ncd", "corporate bond", "government", "sovereign", "g-sec", "sgb"] },
  { name: "Educational", keywords: ["how to", "beginner", "what is", "what are", "explained", "guide"] },
  { name: "Myths/Mistakes", keywords: ["mistake", "avoid", "myth", "truth", "wrong", "never"] },
  { name: "Comparison", keywords: ["vs", "better", "comparison"] },
]

// ---------------------------------------------------------------------------
// classifyVideo — pure function, title → category name
// ---------------------------------------------------------------------------

export const classifyVideo = (title: string): string => {
  const lower = title.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.name
    }
  }
  return "Other"
}

// ---------------------------------------------------------------------------
// computeCategories — aggregate per-channel, per-category stats
// ---------------------------------------------------------------------------

export const computeCategories = (
  channels: RawChannel[],
  videosByChannel: Record<string, RawVideo[]>
): CategoryData[] => {
  const result: CategoryData[] = []

  for (const ch of channels) {
    const videos = videosByChannel[ch.id] ?? []
    if (videos.length === 0) continue

    // Group videos by category
    const groups = new Map<string, RawVideo[]>()
    for (const v of videos) {
      const cat = classifyVideo(v.title)
      const existing = groups.get(cat) ?? []
      existing.push(v)
      groups.set(cat, existing)
    }

    for (const [name, vids] of groups.entries()) {
      const totalViews = vids.reduce((s, v) => s + v.views, 0)
      const totalLikes = vids.reduce((s, v) => s + v.likes, 0)
      const totalComments = vids.reduce((s, v) => s + v.comments, 0)
      const topVideo = vids.reduce(
        (best, v) => (v.views > best.views ? { title: v.title, views: v.views } : best),
        { title: "", views: 0 }
      )

      result.push({
        name,
        channelId: ch.id,
        videoCount: vids.length,
        totalViews,
        avgViews: safeDivide(totalViews, vids.length),
        engagementRate: safeDivide((totalLikes + totalComments) * 100, totalViews),
        topVideo,
      })
    }
  }

  return result
}
