import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ContextNav } from "@/components/layout/context-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { PhaseBadge } from "@/components/layout/phase-badge";
import type { GitHubUser } from "@/lib/types";

export function AppSidebar({ user, onSignOut }: { user: GitHubUser; onSignOut?: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <Wordmark />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
          Navigate
        </p>
        <SidebarNav />
        <ContextNav />
      </div>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <PhaseBadge />
        <UserMenu user={user} variant="full" onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
