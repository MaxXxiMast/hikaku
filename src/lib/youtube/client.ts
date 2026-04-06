/**
 * client.ts — YouTube Data API v3 client.
 *
 * This is the ONLY module in the codebase that calls `fetch`.
 * All other modules are pure computation on normalized RawChannel / RawVideo data.
 *
 * Responsibilities:
 *   - resolveChannel: fetch channel metadata by handle using the channels endpoint
 *   - fetchAllVideos: paginate through a channel's uploads playlist, batch-fetch video details
 *
 * Zod schemas from types.ts validate all API responses and coerce string numbers to numbers.
 * parseDuration from utils.ts converts ISO 8601 duration strings to seconds.
 */

import {
  YouTubeChannelResponseSchema,
  YouTubePlaylistItemsResponseSchema,
  YouTubeVideoResponseSchema,
} from "@/lib/youtube/types"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"
import { parseDuration } from "@/lib/utils"

const BASE_URL = "https://www.googleapis.com"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const normalizeHandle = (handle: string): string =>
  handle.startsWith("@") ? handle : `@${handle}`

const buildUrl = (path: string, params: Record<string, string>): string => {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

const apiFetch = async (url: string): Promise<unknown> => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      (body as { error?: { message?: string } })?.error?.message ?? "Unknown error"
    throw new Error(`YouTube API error (${res.status}): ${message}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// resolveChannel
// ---------------------------------------------------------------------------

/**
 * Resolves a YouTube channel by handle using the channels endpoint with forHandle param.
 * Returns a normalized RawChannel with string numbers coerced to numbers via Zod.
 */
export const resolveChannel = async (
  handle: string,
  apiKey: string
): Promise<RawChannel> => {
  const normalizedHandle = normalizeHandle(handle)

  const url = buildUrl("/youtube/v3/channels", {
    part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
    forHandle: normalizedHandle,
    key: apiKey,
  })

  const raw = await apiFetch(url)
  const parsed = YouTubeChannelResponseSchema.parse(raw)

  if (!parsed.items || parsed.items.length === 0) {
    throw new Error(`Channel not found: ${normalizedHandle}`)
  }

  const item = parsed.items[0]

  return {
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl ?? normalizedHandle,
    subscriberCount: item.statistics.subscriberCount ?? 0,
    totalViews: item.statistics.viewCount ?? 0,
    videoCount: item.statistics.videoCount ?? 0,
    joinedDate: item.snippet.publishedAt,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    description: item.snippet.description ?? "",
    country: item.snippet.country,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? "",
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl,
    keywords: item.brandingSettings?.channel?.keywords ?? [],
    topicCategories: item.topicDetails?.topicCategories ?? [],
  }
}

// ---------------------------------------------------------------------------
// fetchAllVideos
// ---------------------------------------------------------------------------

/**
 * Fetches all videos from a channel's uploads playlist.
 * Paginates through playlistItems (50 per page), collects video IDs,
 * then batch-fetches video details (up to 50 at a time).
 *
 * When `since` is provided, videos with publishedAt < since are filtered out.
 */
export const fetchAllVideos = async (
  uploadsPlaylistId: string,
  apiKey: string,
  options?: { since?: Date }
): Promise<RawVideo[]> => {
  const { since } = options ?? {}

  // --- Step 1: Collect all video IDs via paginated playlistItems ---
  const videoIds: string[] = []
  let pageToken: string | undefined = undefined

  do {
    const params: Record<string, string> = {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
      key: apiKey,
    }
    if (pageToken) {
      params.pageToken = pageToken
    }

    const url = buildUrl("/youtube/v3/playlistItems", params)
    const raw = await apiFetch(url)
    const parsed = YouTubePlaylistItemsResponseSchema.parse(raw)

    for (const item of parsed.items) {
      videoIds.push(item.contentDetails.videoId)
    }

    pageToken = parsed.nextPageToken
  } while (pageToken)

  if (videoIds.length === 0) {
    return []
  }

  // --- Step 2: Batch-fetch video details (up to 50 per request) ---
  const allVideos: RawVideo[] = []

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)

    const url = buildUrl("/youtube/v3/videos", {
      part: "snippet,statistics,contentDetails,topicDetails",
      id: batch.join(","),
      key: apiKey,
    })

    const raw = await apiFetch(url)
    const parsed = YouTubeVideoResponseSchema.parse(raw)

    for (const item of parsed.items) {
      const publishedAt = item.snippet?.publishedAt ?? new Date(0).toISOString()

      // Apply since filter
      if (since && new Date(publishedAt) < since) {
        continue
      }

      const video: RawVideo = {
        id: item.id,
        title: item.snippet?.title ?? "",
        publishedAt,
        views: item.statistics?.viewCount ?? 0,
        likes: item.statistics?.likeCount ?? 0,
        comments: item.statistics?.commentCount ?? 0,
        durationSec: parseDuration(item.contentDetails?.duration ?? ""),
        tags: item.snippet?.tags ?? [],
        description: item.snippet?.description ?? "",
        categoryId: item.snippet?.categoryId ?? "",
        channelId: item.snippet?.channelId ?? "",
        thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? "",
        topicCategories: item.topicDetails?.topicCategories ?? [],
        definition: item.contentDetails?.definition ?? "hd",
        caption: item.contentDetails?.caption === "true",
        defaultLanguage: item.snippet?.defaultLanguage,
      }

      allVideos.push(video)
    }
  }

  return allVideos
}
