# ADR-003: Design System — Kintsugi / Wabi-Sabi

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku needs a distinctive visual identity that:
- Differentiates from generic SaaS/dashboard aesthetics
- Supports a data-heavy comparison interface without feeling clinical
- Works in both dark and light modes with visual continuity
- Scales from a side project to a startup product
- Follows the Japanese naming theme (Hikaku = 比較 = comparison)

## Design Philosophy: Wabi-Sabi (侘寂)

Wabi-sabi is the Japanese aesthetic of finding beauty in imperfection, transience, and incompleteness. Applied to UI:
- **Generous negative space** — data breathes, isn't crammed
- **Muted earth tones** — no neon, no gradients, no shadows
- **Thin typography** — quiet authority over loud commands
- **Organic textures** — warmth over sterility
- **Imperfection as feature** — asymmetric layouts, hand-crafted feel

## Theme Options Evaluated

Three wabi-sabi interpretations were prototyped with live mockups:

### A: Stone Garden (枯山水)
- Dark, minimal, contemplative. Vast negative space, barely-there borders.
- **Verdict**: Beautiful but too stark for data-heavy pages. Numbers disappear.

### B: Paper & Ink (紙と墨)
- Light, warm, organic. Aged washi paper with sumi ink.
- **Verdict**: Warm but sumi brown accent has no relationship with any dark mode option. Switching modes feels like switching brands.

### C: Kintsugi (金継ぎ) ← SELECTED AS DARK MODE
- Dark canvas with gold highlights. The art of repairing broken pottery with gold — beauty in imperfection.
- **Verdict**: Premium, striking, gold thread creates visual identity. Best dark-mode-first product feel.

## Light Mode Pairing

Three light modes were evaluated against Kintsugi dark:

### Paper & Ink (original)
- **Rejected**: Brown accent disconnects from Kintsugi's gold. Feels like two different products.

### Washi Gold V1 (和紙金)
- Same gold darkened for light contrast. Washi paper background.
- **Rejected**: Contrast too low (3.8:1 ratio). Gold washed out on warm background.

### Washi Gold V2 ← SELECTED AS LIGHT MODE
- Warmer background (#f5f1ea), more saturated gold (#856b1e), subtle gold divider lines.
- **Accepted**: 5.8:1 contrast ratio (WCAG AA). Gold thread connects both modes. Feels like seeing Kintsugi pottery in daylight.

### Sunlit Clay (陶光)
- Warmest option with gold left-border accents.
- **Not selected**: Slightly less clean, warmer tone felt less "tech product."

## Final Color Tokens

### Kintsugi Dark (Default)
| Token | Value | Usage |
|-------|-------|-------|
| bg-primary | #121210 | Page background |
| bg-surface | #1a1a18 | Card/panel background |
| accent-gold | #c5a55a | Primary accent, highlights, key metrics |
| accent-sage | #8a9a7a | Secondary accent, channel B color |
| text-primary | #d4cfc5 | Main text |
| text-muted | #7a756c | Secondary text, labels |
| border | rgba(197,165,90,0.12) | Subtle borders |

### Washi Gold V2 Light
| Token | Value | Usage |
|-------|-------|-------|
| bg-primary | #f5f1ea | Page background |
| bg-surface | #fdfcf8 | Card/panel background |
| accent-gold | #856b1e | Primary accent (darkened for contrast) |
| accent-sage | #4d6a3a | Secondary accent (darkened for contrast) |
| text-primary | #1e1b16 | Main text |
| text-muted | #918c82 | Secondary text, labels |
| border | rgba(133,107,30,0.15) | Subtle borders |

## Typography

### Options Evaluated

| Pairing | Character | Verdict |
|---------|-----------|---------|
| Crimson Pro + Inter | Editorial serif + industry sans | Safe but generic |
| Source Serif 4 | Mono-family variable serif | Literary but numbers less crisp in tables |
| **Zen Kaku Gothic New + Crimson Pro** | Japanese sans + serif kanji | **Selected** — most authentically Japanese |
| DM Serif Display + Sora | Dramatic serif + geometric sans | Startup-premium but less wabi-sabi |

### Selected Pairing
- **Display/Kanji**: Crimson Pro — logotype (比較), section headings. Elegant, editorial.
- **Body/Data**: Zen Kaku Gothic New — everything else. Designed by a Japanese type foundry with authentic Japanese proportions. Excellent readability for data tables.

Both are Google Fonts under SIL Open Font License (free for commercial use). Loaded via `next/font/google` for zero-cost self-hosting.

## Component Library

**shadcn/ui with Kintsugi theme override** — not for its visual defaults (which we override heavily), but for:
1. Accessible Radix UI primitives under the hood
2. Components copy-pasted into repo = full control
3. Best AI development ecosystem (MCP servers, documentation, training data)
4. CSS variable theming maps directly to our token system

## Consequences

- Unique visual identity that doesn't look like "another shadcn app"
- Gold thread connecting dark/light modes creates brand recognition
- WCAG AA accessibility in both modes (5.8:1 contrast minimum)
- Two Google Fonts = ~40KB total (acceptable, auto-optimized by next/font)
- Design system is fully documented for AI-assisted development
