export const Footer = () => (
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
