/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeaderNav } from "./header-nav";
import { PoolPlayMark } from "./poolplay-mark";
import { SiteMobileNav } from "./site-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";

export type SiteHeaderUser = {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
};

export function SiteHeader({ user }: { user?: SiteHeaderUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm transition-[background-color,backdrop-filter] duration-300 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1">
      <div className="container mx-auto flex h-14 items-center gap-2 px-4 transition-[padding,gap] duration-300 ease-out sm:gap-4">
        <SiteMobileNav signedIn={Boolean(user)} />
        <PoolPlayMark href="/" wordmarkClassName="text-lg" />
        <HeaderNav className="min-w-0" />
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {user ? (
            <UserMenu
              fullName={user.fullName}
              email={user.email}
              avatarUrl={user.avatarUrl}
            />
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex"
                )}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden sm:inline-flex"
                )}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
