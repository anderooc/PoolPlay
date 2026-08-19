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

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  markNotificationsRead,
  type NotificationCenterItem,
} from "./actions";
import {
  formatNotificationTime,
  notificationKindLabel,
} from "@/lib/notifications/display";
import { cn } from "@/lib/utils";

export function NotificationsList({
  initialItems,
}: {
  initialItems: NotificationCenterItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const unreadCount = items.filter((item) => !item.readAt).length;

  async function markOne(item: NotificationCenterItem) {
    if (item.readAt) return;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row
      )
    );
    await markNotificationsRead([item.id]);
  }

  async function markAll() {
    setItems((prev) =>
      prev.map((row) => ({
        ...row,
        readAt: row.readAt ?? new Date().toISOString(),
      }))
    );
    await markNotificationsRead();
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="Hosts can notify matching captains when a tournament is posted. Host messages, chat announcements, registration updates, and school join requests will also show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void markAll()}
          >
            Mark all as read
          </Button>
        </div>
      ) : null}
      <ul className="divide-y overflow-hidden rounded-lg border">
        {items.map((item) => {
          const unread = !item.readAt;
          const inner = (
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {notificationKindLabel(item.kind)}
                {item.createdAt
                  ? ` · ${formatNotificationTime(item.createdAt)}`
                  : ""}
              </p>
              <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>
                {item.title}
              </p>
              {item.body ? (
                <p className="text-sm text-muted-foreground">{item.body}</p>
              ) : null}
            </div>
          );

          return (
            <li
              key={item.id}
              className={cn(unread && "bg-primary/5")}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={() => void markOne(item)}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/60"
                >
                  {unread ? (
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                  ) : (
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0" />
                  )}
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void markOne(item)}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60"
                >
                  {unread ? (
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                  ) : (
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0" />
                  )}
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
