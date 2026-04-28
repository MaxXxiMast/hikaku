import { z } from "zod"

export const channelHandleSchema = z
  .string()
  .trim()
  .min(1, "Channel handle cannot be empty")
  .max(30, "Handle too long")
  .regex(/^@?[a-zA-Z0-9_.-]+$/, "Invalid channel handle format")

export const apiKeySchema = z
  .string()
  .regex(/^AIza[0-9A-Za-z_-]{35}$/, "Invalid API key format")

export const compareSchema = z.object({
  channels: z
    .array(channelHandleSchema)
    .min(2, "At least 2 channels required")
    .max(2, "Maximum 2 channels for V1")
    .refine(
      (arr) => new Set(arr.map((h) => h.toLowerCase().replace(/^@/, ""))).size === arr.length,
      "Duplicate handles not allowed"
    ),
  apiKey: apiKeySchema.optional(),
})

export type CompareInput = z.infer<typeof compareSchema>
