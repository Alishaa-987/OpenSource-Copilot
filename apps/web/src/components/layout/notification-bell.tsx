"use client";

import Link from "next/link";
import { Bell, CircleDot, CircleSlash, ExternalLink, MessageSquare, PencilLine, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/lib/backend-hooks";
import type { BackendNotification } from "@/lib/backend-types";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Each monitored event kind gets its own mark, so the list is scannable without reading every line. */
function eventIcon(type: string): ReactNode {
  if (type === "new_comment") return <MessageSquare className="size-3.5 text-info" />;
  if (type === "issue_closed") return <CircleSlash className="size-3.5 text-muted-foreground" />;
  if (type === "issue_reopened") return <RotateCcw className="size-3.5 text-warning" />;
  if (type === "issue_retitled") return <PencilLine className="size-3.5 text-muted-foreground" />;
  return <CircleDot className="size-3.5 text-success" />;
}

function eventLabel(type: string): string {
  if (type === "new_comment") return "New comment";
  if (type === "issue_closed") return "Issue closed";
  if (type === "issue_reopened") return "Issue reopened";
  if (type === "issue_retitled") return "Issue renamed";
  return "New issue";
}

/**
 * Notification bell for the topbar. Polls the backend (see useNotifications)
 * so events found by repository-service's background monitor appear without a
 * manual refresh.
 */
export function NotificationBell() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium leading-none text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-medium text-foreground">Repository activity</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              disabled={markAllRead.isPending}
              onClick={(event) => {
                event.preventDefault();
                markAllRead.mutate();
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">
            No activity yet. Imported repositories are checked automatically.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={() => {
                  if (!notification.isRead) markRead.mutate(notification.id);
                }}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ notification, onOpen }: { notification: BackendNotification; onOpen: () => void }) {
  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
      {!notification.isRead && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
      {notification.isRead && <span className="mt-2 size-1.5 shrink-0" aria-hidden />}
      <Link href={notification.url} onClick={onOpen} className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {eventIcon(notification.type)}
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {eventLabel(notification.type)}
          </span>
          {notification.issueNumber > 0 && (
            <span className="text-[11px] text-muted-foreground">#{notification.issueNumber}</span>
          )}
        </span>
        <span className={`mt-0.5 block text-sm leading-5 ${notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
          {notification.message}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {notification.repositoryFullName} · {timeAgo(notification.createdAt)}
        </span>
      </Link>
      {notification.githubUrl && (
        <a
          href={notification.githubUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          className="mt-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          aria-label="Open on GitHub"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}
