# ADR-007: Component Library — shadcn/ui

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Purujit Negi, Claude (AI pair)

## Context

Hikaku needs UI components (buttons, inputs, dialogs, cards, tables, tabs). Options: build from scratch with Tailwind + Radix, or use shadcn/ui.

## Initial Assessment

shadcn/ui was initially rejected because:
- Its visual defaults have a recognizable "shadcn look" that conflicts with Kintsugi aesthetics
- The Wabi-sabi design requires heavy customization
- Component count for V1 is small (~10 components)

## Revised Decision: **Use shadcn/ui**

The decision was reversed based on the **AI-first development** principle.

## Rationale

1. **AI ecosystem advantage** — shadcn has become the de facto standard for AI code generation. Every major AI coding tool (Claude, Cursor, Copilot) has extensive training on shadcn patterns. The MCP server enables consistent AI-generated pages.
2. **Components are copy-pasted, not imported** — when you `npx shadcn add button`, it copies source code into your project. From that point it's YOUR file — every line is editable. This is not a dependency, it's a starting point.
3. **CSS variable theming** — shadcn already uses CSS custom properties. Replacing their tokens with Kintsugi/Washi Gold tokens re-themes the entire library in one file.
4. **Accessibility for free** — Radix UI primitives under the hood handle ARIA, keyboard navigation, focus management.
5. **Compound returns** — as the project grows, AI tools generate consistent, accessible, themed components without per-component instruction.

## Customization Approach

| shadcn Component | Customization Level |
|------------------|-------------------|
| Button | Light — swap colors, adjust border-radius, font |
| Input | Light — gold focus ring, wabi-sabi placeholder style |
| Card | Medium — thinner borders, gold accent, more padding |
| Table | Medium — Kintsugi-styled headers, subtle row lines |
| Tabs | Medium — gold underline indicator, serif labels |
| Dialog | Medium — warm overlay, centered with breathing room |
| Charts | Heavy — full Kintsugi palette, custom grid styling |

## Consequences

- AI tools generate consistent, themed code out of the box
- Accessibility handled by Radix primitives
- Some initial effort to override shadcn defaults with Kintsugi tokens
- The result will NOT look like a "typical shadcn app"
