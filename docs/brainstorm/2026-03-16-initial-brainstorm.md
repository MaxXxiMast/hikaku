# Brainstorm Session — 2026-03-16

## Origin

The idea for Hikaku emerged from a hands-on YouTube channel comparison between Wint Wealth (@WintWealthYT) and Fixed Returns Academy (@FixedReturnsAcademy) built for Grip Invest. The analysis used YouTube Data API v3 to fetch per-video data and compute engagement, growth, content, posting patterns, SEO, and distribution metrics.

The scripts and methodology proved valuable enough to productize as a standalone platform.

## Key Questions Explored

### 1. Project Name
- **Options**: Hikaku (比較 = comparison), Kuraberu (比べる = to compare), Narabi (並び = side by side)
- **Selected**: Hikaku — most honest, shortest, easiest to type. Wabi-sabi in spirit: no metaphor, just truth.

### 2. Tech Stack
- Evaluated Next.js vs SvelteKit vs Astro
- **Selected**: Next.js + Vercel — SSR for OG tags, Upstash one-click, team familiarity, AI ecosystem
- Noted: Astro extraction for `/r/[id]` pages is a smart V2 optimization

### 3. Design Philosophy
- Three wabi-sabi interpretations prototyped: Stone Garden, Paper & Ink, Kintsugi
- **Selected**: Kintsugi (dark default) + Washi Gold V2 (light mode)
- Washi Gold refined from V1 (too dull, 3.8:1 contrast) to V2 (5.8:1, WCAG AA)

### 4. Typography
- Four pairings evaluated with full-width dark+light mockups
- **Selected**: Zen Kaku Gothic New (body) + Crimson Pro (display/kanji)
- Both Google Fonts, SIL Open Font License, free forever

### 5. Component Library
- Initially rejected shadcn/ui (visual defaults conflict with Kintsugi)
- Reversed after considering AI-first development advantage
- **Selected**: shadcn/ui with heavy Kintsugi theming

### 6. Database & Sharing
- Evaluated Upstash, Vercel KV, Supabase, Turso, Cloudflare KV
- **Selected**: Upstash Redis — native TTL for 24h expiry, generous free tier
- Reports store raw + computed data for future AI customization
- Expired reports show re-generate CTA (future paywall)

### 7. Loading Experience
- YouTube API fetches take 5-20 seconds
- **Selected**: Phased reveal + engaging loading screen with facts/tips/quotes
- Each section slides in as computed — dopamine-hit pattern

### 8. Responsive Strategy
- **Selected**: Mobile-first — shared links open on phones
- Desktop gets enhanced layouts, not just stretched mobile

## Participants
- Purujit Negi (product owner, developer)
- Claude (AI pair programmer, analyst)

## Visual Artifacts
- Mockups saved in `.superpowers/brainstorm/` directory
- Font previews, theme comparisons, contrast refinements all prototyped in browser
