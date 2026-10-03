"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ContextNav } from "@/components/layout/context-nav";
import { PhaseBadge } from "@/components/layout/phase-badge";
import { Wordmark } from "@/components/brand";

/**
 * Mobile navigation drawer. Closes automatically on route change so a tap on a
 * link doesn't leave the sheet hanging open.
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = React.useState(pathname);

  // Close the drawer on navigation (incl. back/forward) by adjusting state
  // during render — React's recommended alternative to a pathname effect.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Primary navigation links
        </SheetDescription>

        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard">
            <Wordmark />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          <SidebarNav onNavigate={() => setOpen(false)} />
          <ContextNav onNavigate={() => setOpen(false)} />
        </div>

        <div className="border-t border-sidebar-border p-3">
          <PhaseBadge />
        </div>
      </SheetContent>
    </Sheet>
  );
}
