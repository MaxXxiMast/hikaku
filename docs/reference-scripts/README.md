# Reference Scripts — Original WW vs FRA Analysis

These are the **original proven scripts** from the Wint Wealth vs Fixed Returns Academy YouTube channel comparison that inspired Hikaku. They serve as the algorithmic reference for Plan 2 (Metrics Engine).

## Scripts

| File | Lines | What It Does | Target Module in Hikaku |
|------|-------|-------------|------------------------|
| `youtube-channel-stats.mjs` | 289 | Channel resolution, video fetching, monthly aggregation | `src/lib/youtube/client.ts` + `src/lib/youtube/growth.ts` |
| `youtube-video-breakdown.mjs` | 342 | Category classification, duration analysis, title patterns | `src/lib/youtube/categories.ts` + `src/lib/youtube/titles.ts` |
| `engagement-comparison.mjs` | 287 | Engagement rates, monthly trends, duration breakdown | `src/lib/youtube/engagement.ts` |
| `deep-inference.mjs` | 466 | Gini, percentiles, viral thresholds, posting patterns, SEO | `src/lib/youtube/distribution.ts` + `src/lib/youtube/patterns.ts` |

## Data Files

| File | What It Contains |
|------|-----------------|
| `wint-wealth-yt-raw.csv` | Monthly viewership data for @WintWealthYT (Jun 2022 - Feb 2026) |
| `fixed-returns-academy-raw.csv` | Monthly viewership data for @FixedReturnsAcademy (Aug 2025 - Feb 2026) |
| `channel-comparison-report.md` | The full comparison report generated from these scripts |

## How to Run (standalone)

These scripts can be run independently with a YouTube API key:

```bash
# Channel stats + monthly aggregation
node youtube-channel-stats.mjs <API_KEY> @WintWealthYT

# Detailed video breakdown with categories
node youtube-video-breakdown.mjs <API_KEY> @FixedReturnsAcademy

# Head-to-head engagement comparison
node engagement-comparison.mjs <API_KEY> @WintWealthYT @FixedReturnsAcademy

# Deep inference (distribution, posting, SEO, efficiency)
node deep-inference.mjs <API_KEY> @WintWealthYT @FixedReturnsAcademy
```

## Usage in Hikaku Development

When implementing Plan 2 modules, reference these scripts for:
- Algorithm correctness (the computations are proven against real data)
- Edge case handling (e.g., channels with 0 videos, missing tags)
- Expected output format (compare your module output with these scripts' output)

**Do NOT import these scripts into Hikaku source code.** They are reference material only. The Hikaku modules are TypeScript with proper types, tests, and SOLID architecture — not a direct port.
