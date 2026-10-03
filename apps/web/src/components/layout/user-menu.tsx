"use client";

import Link from "next/link";
import { ChevronsUpDown, ExternalLink, LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitHubIcon } from "@/components/icons";
import type { GitHubUser } from "@/lib/types";

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/**
 * The avatar is the one place the GitHub identity has to be visible, so it is
 * rendered defensively: `referrerPolicy` keeps githubusercontent from
 * rejecting the request, and the fallback is a styled monogram rather than a
 * grey blank, so the menu never looks broken when the image is slow or the
 * account has no picture.
 */
function UserAvatar({ user, className }: { user: GitHubUser; className?: string }) {
  return (
    <Avatar className={className}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserMenu({
  user,
  variant = "compact",
  onSignOut,
}: {
  user: GitHubUser;
  /** `full` shows name + handle (sidebar footer); `compact` is avatar-only (topbar). */
  variant?: "full" | "compact";
  onSignOut?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "full" ? (
          <button className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <UserAvatar user={user} className="size-8 ring-1 ring-border" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-sidebar-muted">@{user.login}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" />
          </button>
        ) : (
          <button
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <UserAvatar user={user} className="size-8 ring-1 ring-border" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {/* The account card repeats the avatar so the open menu also shows who
            is signed in - previously the menu was text-only. */}
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <UserAvatar user={user} className="size-9 ring-1 ring-border" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">@{user.login}</span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound />
            Contributor profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={`https://github.com/${user.login}`}
            target="_blank"
            rel="noreferrer noopener"
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <GitHubIcon className="size-4" />
              GitHub profile
            </span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="danger" onClick={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
