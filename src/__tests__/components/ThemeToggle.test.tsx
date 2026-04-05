import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}))

describe("ThemeToggle", () => {
  it("renders a toggle button", () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole("button", { name: /toggle theme/i })
    ).toBeInTheDocument()
  })
})
