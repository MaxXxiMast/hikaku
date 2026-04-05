import type { Metadata } from "next"
import { Crimson_Pro, Zen_Kaku_Gothic_New } from "next/font/google"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { PostHogProvider } from "@/components/providers/PostHogProvider"
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
  description:
    "Compare up to 4 YouTube channels side-by-side with deep analytics.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${crimsonPro.variable} ${zenKaku.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
