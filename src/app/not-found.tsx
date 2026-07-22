/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center"
      >
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-pretty text-muted-foreground">
          The page may have moved, or the tournament may no longer be public.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonVariants()}>
            Go home
          </Link>
          <Link
            href="/explore"
            className={buttonVariants({ variant: "outline" })}
          >
            Explore tournaments
          </Link>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
