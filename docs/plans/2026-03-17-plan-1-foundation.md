# Plan 1: Foundation + Design System

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Hikaku Next.js project with Convex, Redis, PostHog, the Kintsugi/Washi Gold design system, and core layout components — all wired, themed, and tested.

**Architecture:** Next.js 15 App Router with Convex as persistent backend, Upstash Redis as hot cache, PostHog for analytics. shadcn/ui components themed with Kintsugi (dark) and Washi Gold V2 (light) design tokens. Fonts loaded via next/font/google.

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, Convex, Upstash Redis (@upstash/redis), PostHog (posthog-js), React Hook Form, Zod, next-themes, Recharts

**Spec:** `docs/specs/hikaku-v1-design.md`
**ADRs:** `docs/adrs/001` through `013`

**Core Principles (non-negotiable):**
- **KISS**: Simplest solution that works. No premature abstractions.
- **YAGNI**: Build only what this plan requires. Nothing speculative.
- **SOLID**: One responsibility per file. Components accept only the props they use.
- **DRY**: Shared schemas and utilities, but don't extract until 3+ uses.
- **TDD**: Red → Green → Refactor for every feature.
- **ADD**: Every page ships with analytics events.

---

## File Map

### Created in this plan

```
hikaku/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: fonts, theme, Convex, PostHog providers
│   │   ├── page.tsx                # Placeholder landing page (replaced in Plan 3)
│   │   └── globals.css             # Global styles + token imports
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (installed + themed)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── sonner.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Logo + nav + theme toggle
│   │   │   ├── Footer.tsx          # Minimal footer
│   │   │   └── ThemeToggle.tsx     # Dark/light switch
│   │   └── providers/
│   │       ├── ConvexProvider.tsx   # Convex client provider
│   │       ├── ThemeProvider.tsx    # next-themes provider
│   │       └── PostHogProvider.tsx  # PostHog client provider
│   │   └── analytics/
│   │       └── LandingAnalytics.tsx # landing_visited event (ADD)
│   ├── lib/
│   │   ├── redis.ts                # Upstash Redis client
│   │   ├── rate-limit.ts           # Per-IP rate limiting via Redis
│   │   ├── analytics.ts            # Typed PostHog wrapper
│   │   ├── utils.ts                # cn() + shared utilities
│   │   └── validations.ts          # Zod schemas (shared client+server)
│   └── styles/
│       └── tokens.css              # Kintsugi + Washi Gold design tokens
├── convex/
│   ├── schema.ts                   # Convex data schema
│   ├── reports.ts                  # Report queries/mutations
│   └── crons.ts                    # Scheduled jobs (placeholder)
│   └── __tests__/
│       ├── lib/
│       │   ├── analytics.test.ts       # Analytics wrapper tests
│       │   ├── redis.test.ts           # Redis client tests
│       │   └── validations.test.ts     # Zod schema tests
│       └── components/
│           ├── providers.test.tsx      # Provider rendering tests
│           ├── Header.test.tsx         # Header rendering tests
│           ├── Footer.test.tsx         # Footer rendering tests
│           └── ThemeToggle.test.tsx    # Theme toggle tests
├── .env.local.example              # Environment variable template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                 # shadcn/ui config
├── postcss.config.mjs
└── package.json
```

---

## Chunk 1: Project Scaffold + Tooling

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/purujitnegi/Desktop/puru-codes/hikaku
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

Expected: Next.js 15 project scaffolded with App Router, TypeScript, Tailwind, ESLint.

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/purujitnegi/Desktop/puru-codes/hikaku
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with TypeScript, Tailwind, App Router"
```

### Task 2: Install core dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
pnpm add convex @upstash/redis posthog-js react-hook-form @hookform/resolvers zod next-themes recharts nanoid
```

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest @vitejs/plugin-react jsdom happy-dom
```

- [ ] **Step 3: Verify install succeeded**

```bash
pnpm ls --depth=0
```

Expected: All packages listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install core dependencies (Convex, Redis, PostHog, RHF, Zod, Recharts)"
```

### Task 3: Configure Vitest for testing

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)
- Modify: `tsconfig.json` (add test paths)

- [ ] **Step 1: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/components/ui/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create test setup file**

Create `src/__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add test scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 4: Write a smoke test to verify setup**

Create `src/__tests__/setup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run test to verify setup works**

```bash
pnpm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/__tests__/ package.json
git commit -m "chore: configure Vitest with React Testing Library and jsdom"
```

### Task 4: Create environment variable template

**Files:**
- Create: `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create env template**

Create `.env.local.example`:
```bash
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# YouTube Data API v3
YOUTUBE_API_KEY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Verify .gitignore has .env.local**

Check `.gitignore` contains `.env.local`. Next.js scaffold should have added this. If not:

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "chore: add environment variable template"
```

---

## Chunk 2: Design System — Kintsugi Theme

### Task 5: Create design tokens

**Files:**
- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the design token file**

Create `src/styles/tokens.css`:
```css
@layer base {
  :root {
    /* Washi Gold V2 Light */
    --background: 40 20% 94%;        /* #f5f1ea */
    --foreground: 30 14% 10%;        /* #1e1b16 */
    --card: 40 33% 98%;              /* #fdfcf8 */
    --card-foreground: 30 14% 10%;   /* #1e1b16 */
    --popover: 40 33% 98%;
    --popover-foreground: 30 14% 10%;
    --primary: 42 64% 32%;           /* #856b1e */
    --primary-foreground: 40 20% 94%;
    --secondary: 100 27% 33%;        /* #4d6a3a */
    --secondary-foreground: 40 20% 94%;
    --muted: 35 6% 55%;              /* #918c82 */
    --muted-foreground: 35 6% 55%;
    --accent: 42 64% 32%;
    --accent-foreground: 40 20% 94%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 42 64% 32% / 0.15;
    --input: 42 64% 32% / 0.15;
    --ring: 42 64% 32%;
    --radius: 0.25rem;

    /* Hikaku custom tokens */
    --accent-gold: 42 64% 32%;       /* #856b1e */
    --accent-sage: 100 27% 33%;      /* #4d6a3a */
    --accent-copper: 24 37% 45%;     /* #7a5530 */
    --accent-steel: 215 21% 36%;     /* #4a5a70 */
    --divider: linear-gradient(to right, transparent, hsl(42 64% 32% / 0.15), transparent);

    /* Typography scale */
    --text-display: 2rem;
    --text-heading: 1.4rem;
    --text-body: 1rem;
    --text-data: 0.8rem;
    --text-label: 0.65rem;
    --text-micro: 0.55rem;

    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
  }

  .dark {
    /* Kintsugi Dark */
    --background: 60 8% 7%;          /* #121210 */
    --foreground: 38 10% 80%;        /* #d4cfc5 */
    --card: 60 6% 9%;                /* #1a1a18 */
    --card-foreground: 38 10% 80%;
    --popover: 60 6% 9%;
    --popover-foreground: 38 10% 80%;
    --primary: 43 55% 56%;           /* #c5a55a */
    --primary-foreground: 60 8% 7%;
    --secondary: 96 14% 54%;         /* #8a9a7a */
    --secondary-foreground: 60 8% 7%;
    --muted: 36 6% 45%;              /* #7a756c */
    --muted-foreground: 36 6% 45%;
    --accent: 43 55% 56%;
    --accent-foreground: 60 8% 7%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 43 55% 56% / 0.12;
    --input: 43 55% 56% / 0.12;
    --ring: 43 55% 56%;

    /* Hikaku custom tokens */
    --accent-gold: 43 55% 56%;       /* #c5a55a */
    --accent-sage: 96 14% 54%;       /* #8a9a7a */
    --accent-copper: 22 33% 52%;     /* #b07a5a */
    --accent-steel: 213 16% 55%;     /* #7a8aa0 */
    --divider: linear-gradient(to right, transparent, hsl(43 55% 56% / 0.2), transparent);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add Kintsugi dark + Washi Gold V2 light design tokens"
```

### Task 6: Configure shadcn/ui with Kintsugi theme

**Files:**
- Create: `components.json`
- Modify: `src/app/globals.css`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Initialize shadcn/ui (non-interactive for agentic execution)**

```bash
cd /Users/purujitnegi/Desktop/puru-codes/hikaku
pnpm dlx shadcn@latest init --defaults
```

> **Note:** `--defaults` skips all prompts. If this flag is unavailable in the installed version, run interactively with: Style=Default, Base color=Neutral, CSS variables=Yes, Components=`@/components`, Utils=`@/lib/utils`.

- [ ] **Step 2: Replace globals.css with our theme**

Replace `src/app/globals.css` content:
```css
@import "tailwindcss";
@import "../styles/tokens.css";

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 3: Verify utils.ts exists with cn()**

Check `src/lib/utils.ts` was created by shadcn init. Should contain:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Commit**

```bash
git add components.json src/app/globals.css src/lib/utils.ts tailwind.config.ts
git commit -m "feat: configure shadcn/ui with Kintsugi theme tokens"
```

### Task 7: Install shadcn/ui components

**Files:**
- Create: multiple files in `src/components/ui/`

- [ ] **Step 1: Install required components**

```bash
pnpm dlx shadcn@latest add button input card table tabs dialog tooltip sonner
```

- [ ] **Step 2: Verify components were created**

```bash
ls src/components/ui/
```

Expected: `button.tsx`, `input.tsx`, `card.tsx`, `table.tsx`, `tabs.tsx`, `dialog.tsx`, `tooltip.tsx`, `sonner.tsx` (plus any sub-dependencies shadcn installs).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat: install shadcn/ui components (button, input, card, table, tabs, dialog, tooltip, sonner)"
```

### Task 8: Configure fonts

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/app/layout.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

// Note: next/font/google is mocked in Vitest (it returns CSS variable classNames)
// We test that the layout renders with font CSS variable classes

describe('Font configuration', () => {
  it('renders layout with font CSS variable class names', async () => {
    const { default: RootLayout } = await import('@/app/layout')
    const { container } = render(
      <RootLayout>
        <div data-testid="child">test</div>
      </RootLayout>
    )
    const body = container.querySelector('body')
    // After font config, body should have font variable classes
    expect(body?.className).toContain('font-sans')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/app/layout.test.tsx
```

Expected: FAIL — the default scaffold layout doesn't have `font-sans` with our font variables configured.

- [ ] **Step 3: Configure fonts in layout.tsx**

Replace `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next"
import { Crimson_Pro, Zen_Kaku_Gothic_New } from "next/font/google"
import "./globals.css"

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson",
  weight: ["200", "300", "400", "600"],
  display: "swap",
})

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  variable: "--font-zen-kaku",
  weight: ["300", "400", "500", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Hikaku — 比較 — YouTube Channel Comparison",
  description: "Compare up to 4 YouTube channels side-by-side with deep analytics.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${crimsonPro.variable} ${zenKaku.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Add font families to design tokens (Tailwind v4 pattern)**

Tailwind v4 uses `@theme` in CSS, not `tailwind.config.ts`. Add to the end of `src/styles/tokens.css`:
```css
@theme {
  --font-sans: var(--font-zen-kaku), system-ui, sans-serif;
  --font-display: var(--font-crimson), Georgia, serif;
}
```

> **Note:** Tailwind v4 does NOT use `tailwind.config.ts` for theme extension. All theme customization lives in CSS via `@theme`. Do NOT add fontFamily to tailwind.config.ts.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/app/layout.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/styles/tokens.css src/__tests__/app/
git commit -m "feat: configure Crimson Pro (display) + Zen Kaku Gothic New (body) fonts"
```

---

## Chunk 3: Backend Infrastructure

### Task 9: Set up Convex

**Files:**
- Create: `convex/schema.ts`, `convex/reports.ts`, `convex/crons.ts`
- Modify: `package.json` (convex scripts)

- [ ] **Step 1: Initialize Convex**

```bash
cd /Users/purujitnegi/Desktop/puru-codes/hikaku
pnpm convex init
```

Follow prompts to create a new Convex project named "hikaku".

- [ ] **Step 2: Create the Convex schema**

Create `convex/schema.ts`:
```typescript
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  reports: defineTable({
    // Metadata
    channelHandles: v.array(v.string()),
    generatedAt: v.number(),
    generatedBy: v.optional(v.string()), // user ID, null for anonymous

    // Visibility
    isPublic: v.boolean(),
    publicExpiresAt: v.number(),

    // Lifecycle
    savedBy: v.optional(v.string()),
    purgeAfter: v.optional(v.number()), // null = permanent (saved reports)

    // Data
    raw: v.object({
      channels: v.array(v.any()),
      videos: v.array(v.any()),
    }),
    computed: v.any(),
  })
    .index("by_public", ["isPublic", "publicExpiresAt"])
    .index("by_user", ["savedBy"])
    .index("by_purge", ["purgeAfter"]),

  // Analytics metadata (permanent, lightweight)
  reportMetadata: defineTable({
    channelHandles: v.array(v.string()),
    channelCount: v.number(),
    generatedAt: v.number(),
    totalVideosAnalyzed: v.number(),
  }).index("by_date", ["generatedAt"]),
})
```

- [ ] **Step 3: Create report mutations/queries**

Create `convex/reports.ts`:
```typescript
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const create = mutation({
  args: {
    channelHandles: v.array(v.string()),
    raw: v.object({ channels: v.any(), videos: v.any() }),
    computed: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const SIX_HOURS = 6 * 60 * 60 * 1000
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000

    const reportId = await ctx.db.insert("reports", {
      channelHandles: args.channelHandles,
      generatedAt: now,
      isPublic: true,
      publicExpiresAt: now + SIX_HOURS,
      purgeAfter: now + SEVENTY_TWO_HOURS,
      raw: args.raw,
      computed: args.computed,
    })

    // Save lightweight metadata permanently
    await ctx.db.insert("reportMetadata", {
      channelHandles: args.channelHandles,
      channelCount: args.channelHandles.length,
      generatedAt: now,
      totalVideosAnalyzed: Array.isArray(args.raw.videos) ? args.raw.videos.length : 0,
    })

    return reportId
  },
})

export const getPublic = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id)
    if (!report) return null
    if (!report.isPublic || Date.now() > report.publicExpiresAt) {
      return { expired: true, channelHandles: report.channelHandles }
    }
    return report
  },
})

export const getComputed = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id)
    if (!report) return null
    return {
      computed: report.computed,
      channelHandles: report.channelHandles,
      generatedAt: report.generatedAt,
      isPublic: report.isPublic,
      publicExpiresAt: report.publicExpiresAt,
    }
  },
})
```

- [ ] **Step 4: Create cron placeholder**

Create `convex/crons.ts`:
```typescript
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Expire public report links (runs every 15 minutes)
// Implementation added when internal mutations are ready
// crons.interval("expire public links", { minutes: 15 }, internal.reports.expirePublicLinks)

// Purge anonymous report data (runs every hour)
// crons.interval("purge old reports", { hours: 1 }, internal.reports.purgeExpiredData)

export default crons
```

> **Deferred files:** `convex/users.ts` and `convex/history.ts` are listed in the spec's project structure but depend on Clerk auth integration (V1.5 scope). They will be created in a later plan when auth is implemented.

- [ ] **Step 5: Deploy Convex schema**

```bash
pnpm convex dev
```

Expected: Schema deployed successfully. Leave running or Ctrl+C after confirmation.

- [ ] **Step 6: Commit**

```bash
git add convex/ package.json
git commit -m "feat: set up Convex schema with reports table, mutations, queries"
```

### Task 10: Set up Upstash Redis

**Files:**
- Create: `src/lib/redis.ts`
- Create: `__tests__/lib/redis.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/redis.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
    })),
  },
}))

describe('Redis client', () => {
  it('exports a redis instance', async () => {
    const { redis } = await import('@/lib/redis')
    expect(redis).toBeDefined()
  })

  it('exports cache helper functions', async () => {
    const { cacheReport, getCachedReport } = await import('@/lib/redis')
    expect(typeof cacheReport).toBe('function')
    expect(typeof getCachedReport).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/lib/redis.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Redis client**

Create `src/lib/redis.ts`:
```typescript
import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()

const CACHE_TTL = 4 * 60 * 60 // 4 hours in seconds

export async function cacheReport(reportId: string, computed: unknown): Promise<void> {
  await redis.set(`report:${reportId}:computed`, JSON.stringify(computed), {
    ex: CACHE_TTL,
  })
}

export async function getCachedReport(reportId: string): Promise<unknown | null> {
  const data = await redis.get<string>(`report:${reportId}:computed`)
  if (!data) return null
  return typeof data === 'string' ? JSON.parse(data) : data
}

// Note: Rate limiting is in a separate module (src/lib/rate-limit.ts) per spec.
// See Task 10b below.
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/lib/redis.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redis.ts src/__tests__/lib/redis.test.ts
git commit -m "feat: set up Upstash Redis client with cache and rate limiting helpers"
```

### Task 10b: Create rate-limit module

**Files:**
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Implement rate limiter**

Create `src/lib/rate-limit.ts`:
```typescript
import { redis } from './redis'

export async function checkRateLimit(ip: string, maxRequests = 10, windowSeconds = 3600): Promise<boolean> {
  const key = `ratelimit:${ip}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  return current <= maxRequests
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: extract rate limiting to separate module per spec"
```

### Task 11: Set up PostHog analytics wrapper

**Files:**
- Create: `src/lib/analytics.ts`
- Create: `__tests__/lib/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/analytics.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    init: vi.fn(),
  },
}))

describe('Analytics', () => {
  it('exports trackEvent function', async () => {
    const { trackEvent } = await import('@/lib/analytics')
    expect(typeof trackEvent).toBe('function')
  })

  it('trackEvent calls posthog.capture with correct event name', async () => {
    const posthog = (await import('posthog-js')).default
    const { trackEvent } = await import('@/lib/analytics')

    trackEvent({ event: 'comparison_started', channels: ['@test'], channelCount: 1 })

    expect(posthog.capture).toHaveBeenCalledWith(
      'comparison_started',
      expect.objectContaining({ channels: ['@test'], channelCount: 1 })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/lib/analytics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement analytics wrapper**

Create `src/lib/analytics.ts`:
```typescript
import posthog from 'posthog-js'

// Typed event definitions — never call posthog.capture directly
type HikakuEvent =
  | { event: 'landing_visited'; referrer: string | null; utmSource: string | null; utmMedium: string | null }
  | { event: 'comparison_started'; channels: string[]; channelCount: number }
  | { event: 'comparison_completed'; reportId: string; durationMs: number; channelCount: number }
  | { event: 'comparison_failed'; error: string; channels: string[] }
  | { event: 'report_viewed'; reportId: string; source: 'direct' | 'shared_link' | 'history' }
  | { event: 'report_section_visible'; reportId: string; section: string }
  | { event: 'report_scrolled'; reportId: string; depthPercent: number }
  | { event: 'report_shared'; reportId: string; method: 'copy_link' | 'twitter' | 'linkedin' | 'whatsapp' }
  | { event: 'shared_link_opened'; reportId: string; referrer: string | null }
  | { event: 'report_expired_viewed'; reportId: string; channels: string[] }
  | { event: 'report_regenerated'; reportId: string; channels: string[] }
  | { event: 'pdf_downloaded'; reportId: string; channelCount: number }
  | { event: 'loading_started'; channelCount: number }
  | { event: 'loading_abandoned'; durationMs: number; lastStage: string }
  | { event: 'loading_completed'; durationMs: number }
  | { event: 'signup_started'; source: string }
  | { event: 'signup_completed'; method: string }
  | { event: 'report_saved'; reportId: string }
  | { event: 'api_key_provided'; source: 'landing' | 'quota_exceeded' }

export function trackEvent(eventData: HikakuEvent): void {
  const { event, ...properties } = eventData
  posthog.capture(event, properties)
}

export function initAnalytics(): void {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key) return

  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  })
}

export type { HikakuEvent }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/lib/analytics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/__tests__/lib/analytics.test.ts
git commit -m "feat: add typed PostHog analytics wrapper with HikakuEvent schema"
```

### Task 12: Create Zod validation schemas

**Files:**
- Create: `src/lib/validations.ts`
- Create: `__tests__/lib/validations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/validations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { compareSchema } from '@/lib/validations'

describe('compareSchema', () => {
  it('accepts valid input with 2 channels', () => {
    const result = compareSchema.safeParse({
      channels: ['@WintWealthYT', '@FixedReturnsAcademy'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid input with 4 channels', () => {
    const result = compareSchema.safeParse({
      channels: ['@a', '@b', '@c', '@d'],
    })
    expect(result.success).toBe(true)
  })

  it('auto-accepts handles without @ prefix', () => {
    const result = compareSchema.safeParse({
      channels: ['WintWealthYT', 'FixedReturnsAcademy'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects fewer than 2 channels', () => {
    const result = compareSchema.safeParse({ channels: ['@only_one'] })
    expect(result.success).toBe(false)
  })

  it('rejects more than 4 channels', () => {
    const result = compareSchema.safeParse({
      channels: ['@a', '@b', '@c', '@d', '@e'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid handle characters', () => {
    const result = compareSchema.safeParse({
      channels: ['@valid', '@inv alid'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional apiKey', () => {
    const result = compareSchema.safeParse({
      channels: ['@a', '@b'],
      apiKey: 'AIzaSy123',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- src/__tests__/lib/validations.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement validation schemas**

Create `src/lib/validations.ts`:
```typescript
import { z } from 'zod'

export const channelHandleSchema = z
  .string()
  .regex(/^@?[a-zA-Z0-9_-]+$/, 'Invalid channel handle format')
  .min(1, 'Channel handle cannot be empty')

export const compareSchema = z.object({
  channels: z
    .array(channelHandleSchema)
    .min(2, 'At least 2 channels required')
    .max(4, 'Maximum 4 channels'),
  apiKey: z.string().optional(),
})

export type CompareInput = z.infer<typeof compareSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- src/__tests__/lib/validations.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/__tests__/lib/validations.test.ts
git commit -m "feat: add Zod validation schemas for channel comparison input"
```

---

## Chunk 4: Providers + Layout Components

### Task 13: Create providers

**Files:**
- Create: `src/components/providers/ThemeProvider.tsx`
- Create: `src/components/providers/ConvexProvider.tsx`
- Create: `src/components/providers/PostHogProvider.tsx`

- [ ] **Step 0: Write failing tests for providers**

Create `src/__tests__/components/providers.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}))

vi.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="convex-provider">{children}</div>,
  ConvexReactClient: vi.fn(),
}))

describe('ThemeProvider', () => {
  it('renders children', async () => {
    const { ThemeProvider } = await import('@/components/providers/ThemeProvider')
    render(<ThemeProvider><span>child</span></ThemeProvider>)
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})

describe('PostHogProvider', () => {
  it('renders children', async () => {
    const { PostHogProvider } = await import('@/components/providers/PostHogProvider')
    render(<PostHogProvider><span>child</span></PostHogProvider>)
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})
```

Run: `pnpm test -- src/__tests__/components/providers.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 1: Create ThemeProvider**

Create `src/components/providers/ThemeProvider.tsx`:
```typescript
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 2: Create ConvexProvider**

Create `src/components/providers/ConvexProvider.tsx`:
```typescript
"use client"

import { ConvexProvider as ConvexReactProvider, ConvexReactClient } from "convex/react"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return <ConvexReactProvider client={convex}>{children}</ConvexReactProvider>
}
```

- [ ] **Step 3: Create PostHogProvider**

Create `src/components/providers/PostHogProvider.tsx`:
```typescript
"use client"

import { useEffect } from "react"
import { initAnalytics } from "@/lib/analytics"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics()
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 4: Wire providers into root layout**

Update `src/app/layout.tsx` body:
```typescript
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { ConvexProvider } from "@/components/providers/ConvexProvider"
import { PostHogProvider } from "@/components/providers/PostHogProvider"

// ... (keep existing font config and metadata)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${crimsonPro.variable} ${zenKaku.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ConvexProvider>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </ConvexProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Run provider tests**

```bash
pnpm test -- src/__tests__/components/providers.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/ src/app/layout.tsx src/__tests__/components/providers.test.tsx
git commit -m "feat: add ThemeProvider, ConvexProvider, PostHogProvider and wire into root layout"
```

### Task 14: Create ThemeToggle component

**Files:**
- Create: `src/components/layout/ThemeToggle.tsx`
- Create: `__tests__/components/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/ThemeToggle.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}))

describe('ThemeToggle', () => {
  it('renders a toggle button', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/components/ThemeToggle.test.tsx
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement ThemeToggle**

Create `src/components/layout/ThemeToggle.tsx`:
```typescript
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? "☀" : "☾"}
    </Button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/components/ThemeToggle.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ThemeToggle.tsx src/__tests__/components/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle component with dark/light switching"
```

### Task 15: Create Header component

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `__tests__/components/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/Header.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}))

describe('Header', () => {
  it('renders the Hikaku logo with kanji', () => {
    render(<Header />)
    expect(screen.getByText('比較')).toBeInTheDocument()
    expect(screen.getByText('HIKAKU')).toBeInTheDocument()
  })

  it('renders the theme toggle', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/components/Header.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement Header**

Create `src/components/layout/Header.tsx`:
```typescript
import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <header className="flex items-center justify-between px-[var(--space-xl)] py-[var(--space-lg)] border-b border-border">
      <Link href="/" className="flex items-baseline gap-[var(--space-sm)]">
        <span className="font-display text-[var(--text-display)] font-extralight tracking-[0.1em]">
          比較
        </span>
        <span className="text-[var(--text-label)] text-primary tracking-[0.3em] font-medium">
          HIKAKU
        </span>
      </Link>
      <nav className="flex items-center gap-[var(--space-lg)]">
        <ThemeToggle />
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/components/Header.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/__tests__/components/Header.test.tsx
git commit -m "feat: add Header with Hikaku logo (kanji + romanized) and theme toggle"
```

### Task 16: Create Footer component

**Files:**
- Create: `src/components/layout/Footer.tsx`
- Create: `__tests__/components/Footer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/Footer.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'

describe('Footer', () => {
  it('renders footer with wabi-sabi tagline', () => {
    render(<Footer />)
    expect(screen.getByText(/wabi-sabi/i)).toBeInTheDocument()
  })

  it('renders GitHub link', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/MaxXxiMast/hikaku')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/components/Footer.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement Footer**

Create `src/components/layout/Footer.tsx`:
```typescript
export function Footer() {
  return (
    <footer className="px-[var(--space-xl)] py-[var(--space-lg)] border-t border-border">
      <div className="flex items-center justify-between text-[var(--text-micro)] text-muted-foreground tracking-[0.1em]">
        <span>Built with wabi-sabi</span>
        <a
          href="https://github.com/MaxXxiMast/hikaku"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/__tests__/components/Footer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Footer.tsx src/__tests__/components/Footer.test.tsx
git commit -m "feat: add Footer with wabi-sabi tagline and GitHub link"
```

### Task 17: Wire layout components into a placeholder page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the LandingAnalytics client component (ADD compliance)**

Every page ships with analytics. Create `src/components/analytics/LandingAnalytics.tsx`:
```typescript
"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

export function LandingAnalytics() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    trackEvent({
      event: "landing_visited",
      referrer: document.referrer || null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
    })
  }, [])

  return null // Analytics-only component, no UI
}
```

- [ ] **Step 2: Create placeholder landing page with analytics**

Replace `src/app/page.tsx`:
```typescript
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { LandingAnalytics } from "@/components/analytics/LandingAnalytics"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <LandingAnalytics />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-[var(--space-lg)]">
          <h1 className="font-display text-[4rem] font-extralight tracking-[0.15em] text-foreground">
            比較
          </h1>
          <p className="text-[var(--text-label)] text-muted-foreground tracking-[0.2em] uppercase">
            Compare · Understand · Decide
          </p>
          <p className="text-[var(--text-data)] text-muted-foreground">
            YouTube channel comparison — coming soon
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server works**

```bash
cd /Users/purujitnegi/Desktop/puru-codes/hikaku
pnpm dev
```

Open http://localhost:3000. Verify:
- Kintsugi dark theme renders (dark background, gold accent)
- 比較 kanji displays in Crimson Pro
- Body text in Zen Kaku Gothic New
- Theme toggle switches to Washi Gold light
- Footer visible

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add placeholder landing page with header, footer, Kintsugi theme verification"
```

- [ ] **Step 6: Push and open PR**

```bash
git push origin feature/plan-1-foundation
```

Then open a PR from `feature/plan-1-foundation` → `master` using the project's PR template.

> **Note:** All Plan 1 work should be on branch `feature/plan-1-foundation`. Create this branch before Task 1 begins: `git checkout -b feature/plan-1-foundation`

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `pnpm build` succeeds with zero errors
- [ ] `pnpm test` — all tests pass
- [ ] Dev server shows Kintsugi dark theme at http://localhost:3000
- [ ] Theme toggle switches between Kintsugi dark and Washi Gold V2 light
- [ ] Fonts render correctly: Crimson Pro for 比較, Zen Kaku Gothic New for body
- [ ] Convex dashboard shows schema deployed (reports + reportMetadata tables)
- [ ] `.env.local` has all required values (Convex, Redis, PostHog, YouTube)
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] `landing_visited` event fires on page load (verify in PostHog dashboard or browser network tab)
- [ ] ADD compliance: every page in Plan 1 has at least one analytics event

---

## Next Plan

After Plan 1 is complete, proceed to **Plan 2: Metrics Engine** — the YouTube API client and all computation modules. Plan 2 can be written and partially executed in parallel with Plan 1 (it only depends on types, not running infrastructure).
