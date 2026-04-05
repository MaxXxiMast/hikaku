import { z } from "zod"

export const channelHandleSchema = z
  .string()
  .regex(/^@?[a-zA-Z0-9_-]+$/, "Invalid channel handle format")
  .min(1, "Channel handle cannot be empty")

export const compareSchema = z.object({
  channels: z
    .array(channelHandleSchema)
    .min(2, "At least 2 channels required")
    .max(4, "Maximum 4 channels"),
  apiKey: z.string().optional(),
})

export type CompareInput = z.infer<typeof compareSchema>
