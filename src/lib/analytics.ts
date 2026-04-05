import posthog from "posthog-js"

type HikakuEvent =
  | {
      event: "landing_visited"
      referrer: string | null
      utmSource: string | null
      utmMedium: string | null
    }
  | { event: "comparison_started"; channels: string[]; channelCount: number }
  | {
      event: "comparison_completed"
      reportId: string
      durationMs: number
      channelCount: number
    }
  | { event: "comparison_failed"; error: string; channels: string[] }
  | {
      event: "report_viewed"
      reportId: string
      source: "direct" | "shared_link" | "history"
    }
  | { event: "report_section_visible"; reportId: string; section: string }
  | { event: "report_scrolled"; reportId: string; depthPercent: number }
  | {
      event: "report_shared"
      reportId: string
      method: "copy_link" | "twitter" | "linkedin" | "whatsapp"
    }
  | { event: "shared_link_opened"; reportId: string; referrer: string | null }
  | {
      event: "report_expired_viewed"
      reportId: string
      channels: string[]
    }
  | { event: "report_regenerated"; reportId: string; channels: string[] }
  | { event: "pdf_downloaded"; reportId: string; channelCount: number }
  | { event: "loading_started"; channelCount: number }
  | { event: "loading_abandoned"; durationMs: number; lastStage: string }
  | { event: "loading_completed"; durationMs: number }
  | { event: "signup_started"; source: string }
  | { event: "signup_completed"; method: string }
  | { event: "report_saved"; reportId: string }
  | { event: "api_key_provided"; source: "landing" | "quota_exceeded" }

export function trackEvent(eventData: HikakuEvent): void {
  const { event, ...properties } = eventData
  posthog.capture(event, properties)
}

export function initAnalytics(): void {
  if (typeof window === "undefined") return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key) return

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  })
}

export type { HikakuEvent }
