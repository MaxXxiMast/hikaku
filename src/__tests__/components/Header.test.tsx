import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Header } from "@/components/layout/Header"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}))

describe("Header", () => {
  it("renders the Hikaku logo with kanji", () => {
    render(<Header />)
    expect(screen.getByText("比較")).toBeInTheDocument()
    expect(screen.getByText("HIKAKU")).toBeInTheDocument()
  })

  it("renders the theme toggle", () => {
    render(<Header />)
    expect(
      screen.getByRole("button", { name: /toggle theme/i })
    ).toBeInTheDocument()
  })
})
