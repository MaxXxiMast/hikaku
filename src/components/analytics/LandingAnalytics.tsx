"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

export const LandingAnalytics = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    trackEvent({
      event: "landing_visited",
      referrer: document.referrer || null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
    })
  }, [])

  return null
}
