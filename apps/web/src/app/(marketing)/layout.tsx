import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons";
import { siteConfig } from "@/lib/site";

/**
 * Public marketing shell: slim sticky header (brand, theme, sign-in) and a
 * quiet footer. No app chrome — this frames the landing page only.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0b1016] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1016]/90 text-white backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label={siteConfig.name}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/dashboard">
                <GitHubIcon className="size-4" />
                <span className="hidden sm:inline">Continue with GitHub</span>
                <span className="sm:hidden">Sign in</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-[#0b1016]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span>Repository-grounded guidance · We never run repository code</span>
        </div>
      </footer>
    </div>
  );
}
