"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotificationCenter,
  markNotificationsRead,
  type NotificationCenterItem,
} from "@/app/(dashboard)/notifications/actions";
import {
  formatNotificationTime,
  notificationKindLabel,
} from "@/lib/notifications/display";
import { subscribeToUserNotifications } from "@/lib/notifications/realtime";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function NotificationBell({
  initialUnreadCount = 0,
}: {
  initialUnreadCount?: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationCenterItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const result = await getNotificationCenter(8);
    setUnreadCount(result.unreadCount);
    setItems(result.notifications);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    return subscribeToUserNotifications(supabase, () => {
      void refresh();
    });
  }, []);

  async function handleOpenChange(open: boolean) {
    if (open) {
      await refresh();
    }
  }

  async function handleOpenItem(item: NotificationCenterItem) {
    if (!item.readAt) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationsRead([item.id]);
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) =>
      prev.map((row) => ({
        ...row,
        readAt: row.readAt ?? new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
    await markNotificationsRead();
  }

  const badgeLabel =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover onOpenChange={(open) => void handleOpenChange(open)}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="size-4" />
            {badgeLabel ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {badgeLabel}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
      >
        <PopoverHeader className="flex flex-row items-center justify-between gap-2 border-b px-3 py-2.5">
          <PopoverTitle>Notifications</PopoverTitle>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void handleMarkAllRead()}
            >
              Mark all read
            </Button>
          ) : null}
        </PopoverHeader>
        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul>
              {items.map((item) => {
                const unread = !item.readAt;
                const inner = (
                  <>
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {notificationKindLabel(item.kind)}
                      {item.createdAt
                        ? ` · ${formatNotificationTime(item.createdAt)}`
                        : ""}
                    </p>
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        unread ? "font-medium" : "font-normal"
                      )}
                    >
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.body}
                      </p>
                    ) : null}
                  </>
                );

                return (
                  <li key={item.id} className="border-b last:border-b-0">
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => void handleOpenItem(item)}
                        className={cn(
                          "block px-3 py-2.5 hover:bg-muted/70",
                          unread && "bg-primary/5"
                        )}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleOpenItem(item)}
                        className={cn(
                          "block w-full px-3 py-2.5 text-left hover:bg-muted/70",
                          unread && "bg-primary/5"
                        )}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Link
            href="/notifications"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open Notification Center
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
