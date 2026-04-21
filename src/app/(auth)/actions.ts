"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema, loginSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";

export async function login(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

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

export async function signup(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    fullName: formData.get("fullName") as string,
    university: (formData.get("university") as string) || undefined,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const signupContentError = checkContentFilter(
    parsed.data.fullName,
    parsed.data.university
  );
  if (signupContentError) return { error: signupContentError };

  const supabase = await createClient();
  let data: { user: { id: string } | null } | null = null;
  let error: { message: string } | null = null;
  try {
    const res = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          university: parsed.data.university,
        },
      },
    });
    data = res.data as { user: { id: string } | null };
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

  if (data.user) {
    try {
      await db.insert(users).values({
        authId: data.user.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        university: parsed.data.university || null,
        role: "player",
      });
    } catch {
      // User row may already exist from a trigger
    }
  }

  redirect("/dashboard?welcome=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
