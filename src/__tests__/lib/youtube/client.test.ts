/**
 * client.test.ts — Unit tests for YouTube Data API v3 client.
 *
 * Tests cover:
 *  - resolveChannel: forHandle parameter usage, error handling, handle normalization
 *  - fetchAllVideos: Zod normalization, pagination, since-based time windowing
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RawChannel, RawVideo } from "@/lib/youtube/types"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("YouTube client", () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  describe("resolveChannel", () => {
    it("uses forHandle parameter on channels endpoint (not search)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "UC123",
            snippet: {
              title: "Test Channel",
              publishedAt: "2020-01-01T00:00:00Z",
              customUrl: "@TestChannel",
              description: "Test description",
              thumbnails: { default: { url: "https://thumb.jpg" } },
              country: "IN",
            },
            statistics: { subscriberCount: "1000", viewCount: "50000", videoCount: "100" },
            contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            brandingSettings: { channel: { keywords: "test keywords" } },
            topicDetails: { topicCategories: [] },
          }],
        }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      const channel = await resolveChannel("@TestChannel", "test-api-key")

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain("youtube/v3/channels")
      expect(calledUrl).toContain("forHandle")
      expect(calledUrl).not.toContain("youtube/v3/search")

      expect(channel.id).toBe("UC123")
      expect(channel.subscriberCount).toBe(1000)
      expect(channel.uploadsPlaylistId).toBe("UU123")
      expect(channel.description).toBe("Test description")
    })

    it("throws on channel not found (atomic fail)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await expect(resolveChannel("@NotReal", "key")).rejects.toThrow("Channel not found")
    })

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: "Quota exceeded" } }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await expect(resolveChannel("@Test", "key")).rejects.toThrow()
    })

    it("prepends @ if missing from handle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "UC123",
            snippet: { title: "T", publishedAt: "2020-01-01T00:00:00Z", customUrl: "@T", description: "", thumbnails: { default: { url: "" } } },
            statistics: { subscriberCount: "0", viewCount: "0", videoCount: "0" },
            contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            topicDetails: { topicCategories: [] },
          }],
        }),
      })

      const { resolveChannel } = await import("@/lib/youtube/client")
      await resolveChannel("TestChannel", "key")

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain("forHandle=%40TestChannel")
    })
  })

  describe("fetchAllVideos", () => {
    it("fetches videos and normalizes through Zod", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { contentDetails: { videoId: "v1" } },
            { contentDetails: { videoId: "v2" } },
          ],
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: "v1",
              snippet: {
                title: "Video 1",
                publishedAt: "2024-01-15T18:00:00Z",
                description: "Desc 1",
                tags: ["test"],
                categoryId: "22",
                thumbnails: { default: { url: "https://thumb1.jpg" } },
              },
              statistics: { viewCount: "1000", likeCount: "50", commentCount: "10" },
              contentDetails: { duration: "PT5M30S", definition: "hd", caption: "false" },
              topicDetails: { topicCategories: [] },
            },
            {
              id: "v2",
              snippet: {
                title: "Video 2",
                publishedAt: "2024-02-01T14:00:00Z",
                description: "Desc 2",
                categoryId: "27",
                thumbnails: { default: { url: "https://thumb2.jpg" } },
              },
              statistics: { viewCount: "500", likeCount: "25", commentCount: "5" },
              contentDetails: { duration: "PT10M", definition: "hd", caption: "true" },
              topicDetails: { topicCategories: [] },
            },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "test-api-key")

      expect(videos).toHaveLength(2)
      expect(videos[0].title).toBe("Video 1")
      expect(videos[0].views).toBe(1000)
      expect(videos[0].durationSec).toBe(330)
      expect(videos[0].description).toBe("Desc 1")
      expect(videos[1].tags).toEqual([])  // Missing tags defaults to []
    })

    it("paginates through multiple pages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: "v1" } }],
          nextPageToken: "PAGE2",
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: "v2" } }],
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: "v1", snippet: { title: "V1", publishedAt: "2024-01-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "100" }, contentDetails: { duration: "PT1M", definition: "hd" }, topicDetails: { topicCategories: [] } },
            { id: "v2", snippet: { title: "V2", publishedAt: "2024-02-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "200" }, contentDetails: { duration: "PT2M", definition: "hd" }, topicDetails: { topicCategories: [] } },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "key")
      expect(videos).toHaveLength(2)
    })

    it("respects since parameter — stops when video is older than cutoff", async () => {
      const since = new Date("2024-06-01T00:00:00Z")

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { contentDetails: { videoId: "v1" } },
            { contentDetails: { videoId: "v2" } },
          ],
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: "v1", snippet: { title: "Recent", publishedAt: "2024-07-15T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "100" }, contentDetails: { duration: "PT1M", definition: "hd" }, topicDetails: { topicCategories: [] } },
            { id: "v2", snippet: { title: "Old", publishedAt: "2024-03-01T00:00:00Z", description: "", categoryId: "22", thumbnails: { default: { url: "" } } }, statistics: { viewCount: "200" }, contentDetails: { duration: "PT2M", definition: "hd" }, topicDetails: { topicCategories: [] } },
          ],
        }),
      })

      const { fetchAllVideos } = await import("@/lib/youtube/client")
      const videos = await fetchAllVideos("UU123", "key", { since })

      expect(videos).toHaveLength(1)
      expect(videos[0].title).toBe("Recent")
    })
  })
})
