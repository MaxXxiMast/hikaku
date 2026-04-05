import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { LandingAnalytics } from "@/components/analytics/LandingAnalytics"

const Home = () => (
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

export default Home
