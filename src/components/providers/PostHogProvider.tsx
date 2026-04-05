"use client"

import { useEffect } from "react"
import { initAnalytics } from "@/lib/analytics"

export const PostHogProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  useEffect(() => {
    initAnalytics()
  }, [])

  return <>{children}</>
}
