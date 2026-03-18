import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  reports: defineTable({
    channelHandles: v.array(v.string()),
    generatedAt: v.number(),
    generatedBy: v.optional(v.string()),
    isPublic: v.boolean(),
    publicExpiresAt: v.number(),
    savedBy: v.optional(v.string()),
    purgeAfter: v.optional(v.number()),
    raw: v.object({
      channels: v.array(v.any()),
      videos: v.array(v.any()),
    }),
    computed: v.any(),
  })
    .index("by_public", ["isPublic", "publicExpiresAt"])
    .index("by_user", ["savedBy"])
    .index("by_purge", ["purgeAfter"]),

  reportMetadata: defineTable({
    channelHandles: v.array(v.string()),
    channelCount: v.number(),
    generatedAt: v.number(),
    totalVideosAnalyzed: v.number(),
  }).index("by_date", ["generatedAt"]),
})
