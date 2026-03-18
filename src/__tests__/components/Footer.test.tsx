import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Footer } from "@/components/layout/Footer"

describe("Footer", () => {
  it("renders footer with wabi-sabi tagline", () => {
    render(<Footer />)
    expect(screen.getByText(/wabi-sabi/i)).toBeInTheDocument()
  })

  it("renders GitHub link", () => {
    render(<Footer />)
    const link = screen.getByRole("link", { name: /github/i })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/MaxXxiMast/hikaku"
    )
  })
})
