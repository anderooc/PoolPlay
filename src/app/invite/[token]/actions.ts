"use server";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { acceptMemberInvite } from "@/lib/invites/member-invites";

export async function acceptInviteAction(token: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const result = await acceptMemberInvite({
    token,
    userId: user.id,
    userEmail: user.email,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(result.redirectTo);
}
