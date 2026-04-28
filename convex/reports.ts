import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internalMutation } from "./_generated/server"

export const create = mutation({
  args: {
    channelHandles: v.array(v.string()),
    raw: v.object({ channels: v.array(v.any()), videos: v.array(v.any()) }),
    computed: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const SIX_HOURS = 6 * 60 * 60 * 1000
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000

    const reportId = await ctx.db.insert("reports", {
      channelHandles: args.channelHandles,
      generatedAt: now,
      isPublic: true,
      publicExpiresAt: now + SIX_HOURS,
      purgeAfter: now + SEVENTY_TWO_HOURS,
      raw: args.raw,
      computed: args.computed,
    })

    await ctx.db.insert("reportMetadata", {
      channelHandles: args.channelHandles,
      channelCount: args.channelHandles.length,
      generatedAt: now,
      totalVideosAnalyzed: Array.isArray(args.raw.videos)
        ? args.raw.videos.length
        : 0,
    })

    return reportId
  },
})

export const getPublic = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id)
    if (!report) return null
    if (!report.isPublic || Date.now() > report.publicExpiresAt) {
      return { expired: true, channelHandles: report.channelHandles }
    }
    return {
      computed: report.computed,
      channelHandles: report.channelHandles,
      generatedAt: report.generatedAt,
      isPublic: report.isPublic,
      publicExpiresAt: report.publicExpiresAt,
    }
  },
})

export const getComputed = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id)
    if (!report) return null
    return {
      computed: report.computed,
      channelHandles: report.channelHandles,
      generatedAt: report.generatedAt,
      isPublic: report.isPublic,
      publicExpiresAt: report.publicExpiresAt,
    }
  },
})

export const expirePublicLinks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect()

    for (const report of reports) {
      if (report.publicExpiresAt < now) {
        await ctx.db.patch(report._id, { isPublic: false })
      }
    }
  },
})

export const purgeExpiredData = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_purge")
      .collect()

    for (const report of reports) {
      if (report.purgeAfter && report.purgeAfter < now) {
        await ctx.db.patch(report._id, {
          raw: { channels: [], videos: [] },
          computed: null,
        })
      }
    }
  },
})
