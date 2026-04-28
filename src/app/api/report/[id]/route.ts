import { NextRequest, NextResponse } from "next/server"
import { getCachedReport } from "@/lib/redis"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params

  // Try Redis first (fast path)
  try {
    const cached = await getCachedReport(id)
    if (cached) {
      return NextResponse.json({
        found: true,
        data: { computed: cached },
      })
    }
  } catch {
    // Redis failure — fall through to Convex
  }

  // Convex fallback (source of truth)
  try {
    const report = await convex.query(api.reports.getPublic, {
      id: id as any,
    })

    if (!report) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    if ("expired" in report && report.expired) {
      return NextResponse.json({
        found: false,
        expired: true,
        channelHandles: report.channelHandles,
      })
    }

    return NextResponse.json({
      found: true,
      data: report,
    })
  } catch {
    return NextResponse.json({ found: false }, { status: 404 })
  }
}
