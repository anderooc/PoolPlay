/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authRateLimits } from "@/lib/db/schema";

type AuthRateLimitScope = "login" | "password-reset" | "signup";

const LIMITS: Record<
  AuthRateLimitScope,
  {
    windowMs: number;
    ipLimit: number;
    emailLimit: number;
  }
> = {
  login: { windowMs: 15 * 60_000, ipLimit: 20, emailLimit: 10 },
  signup: { windowMs: 60 * 60_000, ipLimit: 8, emailLimit: 3 },
  "password-reset": {
    windowMs: 60 * 60_000,
    ipLimit: 10,
    emailLimit: 3,
  },
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string };

function rateLimitSecret(): string | null {
  return process.env.AUTH_RATE_LIMIT_SECRET ?? process.env.DATABASE_URL ?? null;
}

function hashIdentifier(kind: "email" | "ip", value: string): string | null {
  const secret = rateLimitSecret();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`${kind}:${value}`)
    .digest("hex");
}

async function clientIpAddress(): Promise<string | null> {
  const requestHeaders = await headers();
  const cloudflareIp = requestHeaders.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp.trim();

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}

async function consumeCounter(
  scope: string,
  keyHash: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const proposedExpiry = new Date(now.getTime() + windowMs);
  // Drizzle's sql`` interpolates JS Date via String(), which Postgres rejects
  // as timestamptz. Keep dates in .values()/.set() or pass ISO strings only.
  const proposedExpiryIso = proposedExpiry.toISOString();
  const [counter] = await db
    .insert(authRateLimits)
    .values({
      keyHash,
      scope,
      attempts: 1,
      windowExpiresAt: proposedExpiry,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [authRateLimits.keyHash, authRateLimits.scope],
      set: {
        attempts: sql`CASE
          WHEN ${authRateLimits.windowExpiresAt} <= now() THEN 1
          ELSE ${authRateLimits.attempts} + 1
        END`,
        windowExpiresAt: sql`CASE
          WHEN ${authRateLimits.windowExpiresAt} <= now() THEN ${proposedExpiryIso}::timestamptz
          ELSE ${authRateLimits.windowExpiresAt}
        END`,
        updatedAt: now,
      },
    })
    .returning({
      attempts: authRateLimits.attempts,
      windowExpiresAt: authRateLimits.windowExpiresAt,
    });

  if (!counter) {
    throw new Error("auth rate limit upsert returned no row");
  }

  const expiresAt =
    counter.windowExpiresAt instanceof Date
      ? counter.windowExpiresAt
      : new Date(counter.windowExpiresAt);

  return {
    allowed: counter.attempts <= limit,
    retryAfterMs: Math.max(0, expiresAt.getTime() - now.getTime()),
  };
}

export async function checkAuthRateLimit(
  scope: AuthRateLimitScope,
  email: string
): Promise<RateLimitResult> {
  const limits = LIMITS[scope];
  const normalizedEmail = email.trim().toLowerCase();
  const ip = await clientIpAddress();
  const counters: Array<Promise<{ allowed: boolean; retryAfterMs: number }>> = [];

  const emailHash = hashIdentifier("email", normalizedEmail);
  if (emailHash) {
    counters.push(
      consumeCounter(
        `${scope}:email`,
        emailHash,
        limits.emailLimit,
        limits.windowMs
      )
    );
  }

  const ipHash = ip ? hashIdentifier("ip", ip) : null;
  if (ipHash) {
    counters.push(
      consumeCounter(`${scope}:ip`, ipHash, limits.ipLimit, limits.windowMs)
    );
  }

  if (counters.length === 0) {
    return process.env.NODE_ENV === "production"
      ? {
          allowed: false,
          message: "Authentication is temporarily unavailable. Try again later.",
        }
      : { allowed: true };
  }

  try {
    const results = await Promise.all(counters);
    const blocked = results.find((result) => !result.allowed);
    if (!blocked) return { allowed: true };

    const minutes = Math.max(1, Math.ceil(blocked.retryAfterMs / 60_000));
    return {
      allowed: false,
      message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    console.error("Authentication rate limit check failed", error);
    return {
      allowed: false,
      message: "Authentication is temporarily unavailable. Try again later.",
    };
  }
}
