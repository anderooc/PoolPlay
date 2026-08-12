/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { MetadataRoute } from "next";
import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { appBaseUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appBaseUrl();
  const publicTournaments = await db
    .select({
      slug: tournaments.slug,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .where(ne(tournaments.status, "draft"));

  return [
    {
      url: new URL("/", baseUrl).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/explore", baseUrl).toString(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: new URL("/about", baseUrl).toString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/privacy", baseUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/terms", baseUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...publicTournaments.map((tournament) => ({
      url: new URL(
        `/explore/tournaments/${tournament.slug}`,
        baseUrl
      ).toString(),
      lastModified: tournament.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
