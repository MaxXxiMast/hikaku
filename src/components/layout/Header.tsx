import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export const Header = () => (
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
