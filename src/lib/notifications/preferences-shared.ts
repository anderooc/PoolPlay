/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import type { UserNotificationKind } from "@/types";

export type NotificationPreference = {
  pushEnabled: boolean;
  emailEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCE: NotificationPreference = {
  pushEnabled: true,
  emailEnabled: false,
};

export const NOTIFICATION_KINDS: UserNotificationKind[] = [
  "tournament_posted",
  "tournament_message",
  "chat_announcement",
  "registration_update",
  "school_join_request",
  "school_join_update",
];
