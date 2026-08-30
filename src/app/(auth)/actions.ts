"use server";

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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators";
import { appBaseUrl } from "@/lib/email/resend";
import { checkAuthRateLimit } from "@/lib/rate-limit/auth";
import {
  confirmPasswordResetForViewer,
  requestPasswordResetEmail,
  signUpAccount,
} from "@/lib/api/queries/auth-mutations";
import { getCurrentUser } from "@/lib/auth";

export async function login(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const rateLimit = await checkAuthRateLimit("login", parsed.data.email);
  if (!rateLimit.allowed) return { error: rateLimit.message };

  const supabase = await createClient();
  let error: { message: string } | null = null;
  try {
    const res = await supabase.auth.signInWithPassword(parsed.data);
    error = res.error;
  } catch {
    return {
      error:
        "Authentication service is unavailable or blocked from this network. Try again in a few minutes or switch networks.",
    };
  }

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard?welcome=1");
}

export async function requestPasswordReset(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
  };

  try {
    const result = await requestPasswordResetEmail({
      email: raw.email,
      redirectTo: `${appBaseUrl()}/auth/callback?next=/reset-password`,
    });
    return {
      success: true as const,
      message: result.message,
    };
  } catch (cause) {
    return {
      error:
        cause instanceof Error ? cause.message : "Could not send reset email.",
    };
  }
}

export async function updatePassword(formData: FormData) {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Your reset link expired. Request a new one from the sign-in page." };
  }

  const result = await confirmPasswordResetForViewer(user, raw).catch(
    (cause: unknown) => ({
      error: cause instanceof Error ? cause.message : "Could not update password.",
    })
  );
  if ("error" in result) return result;

  redirect("/login?reset=success");
}

export async function signup(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    fullName: formData.get("fullName") as string,
  };

  const result = await signUpAccount(raw).catch((cause: unknown) => ({
    error: cause instanceof Error ? cause.message : "Could not create account.",
  }));
  if ("error" in result) return result;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: raw.email,
    password: raw.password,
  });
  if (error) return { error: error.message };

  redirect("/dashboard?welcome=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
