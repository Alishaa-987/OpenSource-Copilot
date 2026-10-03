"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Primary navigation links with active-route highlighting. Shared by the
 * desktop sidebar and the mobile sheet so both stay in sync.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {primaryNav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-start gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0 transition-colors",
                active
                  ? "text-primary"
                  : "text-sidebar-muted group-hover:text-sidebar-foreground",
              )}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{item.title}</span>
              {/* The nav item descriptions already existed in site.ts but were
                  never rendered, which left the sidebar looking empty. */}
              <span className="truncate text-xs font-normal opacity-70">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
