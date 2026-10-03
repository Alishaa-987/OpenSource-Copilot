"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/lib/site";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Wordmark } from "@/components/brand";
import type { GitHubUser } from "@/lib/types";

function sectionTitle(pathname: string): string {
  const match = primaryNav.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title ?? "";
}

/**
 * Top bar. Sticky, translucent-on-scroll surface. Keeps chrome minimal so it
 * never competes with page headers: on desktop it shows the section name; on
 * mobile it carries the drawer trigger, brand, and account menu.
 */
export function Topbar({ user, onSignOut }: { user: GitHubUser; onSignOut?: () => void }) {
  const pathname = usePathname();
  const title = sectionTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <MobileNav />
        <Link href="/dashboard" aria-label="Home">
          <Wordmark showName={false} />
        </Link>
      </div>

      {title && (
        // Wayfinding label, not a page heading â€” each page owns its own <h1>,
        // so this stays a plain span to keep one heading per page.
        <span className="hidden text-sm font-medium text-muted-foreground lg:block">
          {title}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />
        <ThemeToggle />
        <div className="lg:hidden">
          <UserMenu user={user} variant="compact" onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}

