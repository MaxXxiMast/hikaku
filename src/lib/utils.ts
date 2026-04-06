import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNumber = (n: number): string => {
  if (n === 0) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${Math.round(n)}`
}

export const median = (arr: number[]): number => {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  // floor(p/100 * n) + 1 gives 1-based rank; e.g. p90 of 100 elements → rank 91
  const index = Math.floor((p / 100) * sorted.length)
  return sorted[index]
}

export const computeGini = (values: number[]): number => {
  if (values.length <= 1) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n
  if (mean === 0) return 0
  const numerator = sorted.reduce((sum, v, i) => sum + (2 * (i + 1) - n - 1) * v, 0)
  return numerator / (n * n * mean)
}

export const parseDuration = (iso8601: string): number => {
  const match = iso8601.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? "0", 10)
  const minutes = parseInt(match[2] ?? "0", 10)
  const seconds = parseInt(match[3] ?? "0", 10)
  return hours * 3600 + minutes * 60 + seconds
}

export const engagementRate = (likes: number, comments: number, views: number): number => {
  if (views === 0) return 0
  return ((likes + comments) / views) * 100
}

export const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0) return 0
  return numerator / denominator
}
