import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-themes", () => ({
  ThemeProvider: ({
    children,
  }: {
    children: React.ReactNode
  }) => <div data-testid="theme-provider">{children}</div>,
}))

vi.mock("convex/react", () => ({
  ConvexProvider: ({
    children,
  }: {
    children: React.ReactNode
  }) => <div data-testid="convex-provider">{children}</div>,
  ConvexReactClient: vi.fn(),
}))

describe("ThemeProvider", () => {
  it("renders children", async () => {
    const { ThemeProvider } = await import(
      "@/components/providers/ThemeProvider"
    )
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    )
    expect(screen.getByText("child")).toBeInTheDocument()
  })
})

describe("PostHogProvider", () => {
  it("renders children", async () => {
    const { PostHogProvider } = await import(
      "@/components/providers/PostHogProvider"
    )
    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    )
    expect(screen.getByText("child")).toBeInTheDocument()
  })
})
