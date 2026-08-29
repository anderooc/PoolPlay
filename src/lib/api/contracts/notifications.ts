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

import type { UserNotificationKind } from "@/types";

export interface NotificationItemContract {
  id: string;
  kind: UserNotificationKind;
  kindLabel: string;
  title: string;
  body: string | null;
  href: string | null;
  mobileHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsContract {
  unreadCount: number;
  notifications: NotificationItemContract[];
}

export interface NotificationsReadResultContract {
  success: true;
  unreadCount: number;
}
