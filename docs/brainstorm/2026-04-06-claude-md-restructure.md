# Brainstorm: CLAUDE.md Restructure

**Date**: 2026-04-06
**Participants**: Purujit Negi + Claude (AI pair)
**Context**: Current `.claude/CLAUDE.md` is 310 lines — 3x the recommended ~100 line target. Contains design tokens, architecture diagrams, coding style rules, data flow details, and report section lists that belong in topic-specific rules files or the spec.

---

## Problem Statement

The root CLAUDE.md has grown into a catch-all document. Every decision from the brainstorming sessions got added directly to it. This causes:

1. **Token waste** — 310 lines loaded into every session, most irrelevant to any specific task
2. **Adherence drop** — Claude follows shorter, specific instructions better (~80% adherence). Long docs get skimmed.
3. **Duplication** — design tokens are in CLAUDE.md AND tokens.css AND the spec. Data lifecycle is in CLAUDE.md AND ADR-011 AND the spec.
4. **Wrong abstraction** — CLAUDE.md should be a compass ("what is this, how do we work, where to look"), not an encyclopedia.

## Official Best Practices (from Claude Code docs)

- **Target under 200 lines** per CLAUDE.md file, ideally shorter
- **Use `.claude/rules/`** for topic-specific, modular guidelines
- **Path-scoped rules** load only when Claude edits matching files (zero context cost otherwise)
- **CLAUDE.md = project compass**; rules/ = detailed guardrails
- **Bullet points > paragraphs** for better adherence

## Questions to Resolve

### Q1: What belongs in root CLAUDE.md vs rules/ vs spec?

| Content Type | Current Location | Proposed Location | Why |
|---|---|---|---|
| "What is Hikaku" | CLAUDE.md | **CLAUDE.md** | Every session needs this |
| Tech stack table | CLAUDE.md | **CLAUDE.md** | Quick reference, always relevant |
| Core principles (KISS/YAGNI/SOLID/DRY/TDD/ADD) | CLAUDE.md (40+ lines with examples) | **CLAUDE.md** (one-liners) + **rules/development-process.md** (full detail) | Principles always relevant; examples only when coding |
| Design tokens (hex values, CSS vars) | CLAUDE.md + tokens.css + spec | **rules/design-system.md** (path-scoped to `src/styles/**`, `src/components/**`) | Only relevant when touching UI |
| Typography rules | CLAUDE.md + spec | **rules/design-system.md** | Same — UI-only |
| Coding style (arrow functions, no classes) | CLAUDE.md | **rules/coding-style.md** | Always relevant when writing code, but detailed rules don't need to be in root |
| Data flow diagram | CLAUDE.md + spec | **Spec only** (remove from CLAUDE.md) | Implementation detail, not compass |
| Data lifecycle (Convex vs Redis split) | CLAUDE.md + ADR-011 | **rules/data-architecture.md** (path-scoped to `src/lib/**`, `convex/**`) | Only relevant when touching data layer |
| Report sections list | CLAUDE.md + spec | **Spec only** (remove from CLAUDE.md) | Implementation detail |
| YouTube API specifics (forHandle, since, etc.) | NOT in CLAUDE.md yet | **rules/api/youtube.md** (path-scoped to `src/lib/youtube/**`) | Only relevant when touching YouTube modules |
| "What NOT to do" | CLAUDE.md | **CLAUDE.md** (top 5) + **rules/** (detailed per-topic) | Most critical don'ts always loaded; rest contextual |
| File structure | CLAUDE.md | **CLAUDE.md** (abbreviated) | Always useful for navigation |
| "Read before coding" pointers | CLAUDE.md | **CLAUDE.md** | The compass function |
| API key management | CLAUDE.md | **rules/api/youtube.md** | Only relevant when touching API code |
| Git conventions | CLAUDE.md | **rules/development-process.md** | Only relevant when committing |

### Q2: Proposed .claude/ structure

```
.claude/
├── CLAUDE.md                        # ~80-100 lines: compass only
├── CLAUDE.local.md                  # Personal overrides (gitignored)
├── settings.json                    # Existing
└── rules/
    ├── design-system.md             # Tokens, typography, spacing, component overrides
    │   paths: src/styles/**, src/components/**, src/app/**/*.tsx
    │
    ├── coding-style.md              # Arrow functions, functional, no classes, imports, TS strict
    │   (no paths — always loaded, applies to all code)
    │
    ├── development-process.md       # TDD, ADD, KISS/YAGNI/SOLID/DRY with examples, git conventions
    │   (no paths — always loaded, applies to all work)
    │
    ├── data-architecture.md         # Convex vs Redis split, data lifecycle, fat storage, Zod validation
    │   paths: src/lib/**, convex/**
    │
    └── api/
        └── youtube.md              # forHandle, since param, atomic fail, quota budget, API response shapes
            paths: src/lib/youtube/**
```

### Q3: What does the slimmed CLAUDE.md look like?

```markdown
# Hikaku (比較) — Project Instructions

## What Is This
YouTube channel comparison platform (2-4 channels). Wabi-sabi Japanese aesthetic.
Repo: github.com/MaxXxiMast/hikaku | Owner: @MaxXxiMast

## Tech Stack
[15-line table: framework, styling, backend, cache, hosting, fonts, analytics]

## Core Principles
- KISS: Simplest solution. No abstraction until 3+ uses.
- YAGNI: If the spec doesn't mention it, don't build it.
- SOLID: One responsibility per file.
- DRY: Don't extract until 3+ uses.
- TDD: Red → Green → Refactor. Every feature.
- ADD: Every page ships with analytics events.

## Before You Code
- Read the spec: docs/specs/hikaku-v1-design.md
- Check ADRs: docs/adrs/ (15 decisions documented)
- Check decision log: docs/decisions/DECISION_LOG.md
- Follow the SDLC: docs/sdlc/ai-native-sdlc.md
- Reference scripts: docs/reference-scripts/

## Key Don'ts
- Don't hardcode colors — use CSS variables / Tailwind tokens
- Don't skip tests — TDD is mandatory
- Don't add features not in the spec
- Don't use classes or `this` — functional only
- Don't create components without checking shadcn/ui first

## File Structure
[15-line abbreviated tree: app/, convex/, lib/, components/, styles/, __tests__/]
```

~75 lines. Everything else lives in `rules/` files loaded contextually.

### Q4: Path-scoped rules — what triggers what?

| Rule File | Paths | Loads When |
|---|---|---|
| design-system.md | `src/styles/**`, `src/components/**`, `src/app/**/*.tsx` | Editing UI code |
| coding-style.md | (none — always loaded) | Every session |
| development-process.md | (none — always loaded) | Every session |
| data-architecture.md | `src/lib/**`, `convex/**` | Editing backend/data code |
| api/youtube.md | `src/lib/youtube/**` | Editing YouTube modules only |

### Q5: Migration plan

1. Create `rules/` directory with 5 files
2. Move content from CLAUDE.md to appropriate rules files
3. Slim CLAUDE.md to ~80 lines
4. Verify no content is lost (diff old vs new aggregate)
5. Create CLAUDE.local.md template (gitignored)
6. Test: start a new session, verify rules load correctly

## Decisions Needed

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | coding-style.md: always loaded or path-scoped? | Always / path-scoped to `src/**` | Always — coding style applies everywhere |
| 2 | development-process.md: always loaded or path-scoped? | Always / path-scoped | Always — TDD/ADD/principles apply to all work |
| 3 | Should we add a rules/testing.md? | Yes / fold into development-process.md | Fold — testing guidance is part of development process, not a separate domain |
| 4 | CLAUDE.local.md: create template or skip for now? | Create / skip | Create — sets the pattern for team usage |
| 5 | When to do this migration? | Now (before Plan 2) / during Plan 2 / after Plan 2 | Before Plan 2 — clean foundation for the next execution cycle |

---

*This brainstorm documents the analysis. Decisions and implementation follow the SDLC: brainstorm → ADR (if needed) → execute.*
