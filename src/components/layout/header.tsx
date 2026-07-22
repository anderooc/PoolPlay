/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { MobileNav } from "./mobile-nav";
import { HeaderNav } from "./header-nav";
import { ShootSetMark } from "./shoot-set-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";
import { SkipLink } from "./skip-link";

export type HeaderUserProfile = {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
};

export function Header({
  isAdmin = false,
  schoolsHref,
  user,
}: {
  isAdmin?: boolean;
  schoolsHref?: string;
  user?: HeaderUserProfile | null;
}) {
  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur-sm transition-[background-color,backdrop-filter,padding,gap] duration-300 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 sm:gap-3 sm:px-4 md:gap-4 md:px-6">
        <MobileNav isAdmin={isAdmin} schoolsHref={schoolsHref} />
        <ShootSetMark href="/" wordmarkClassName="text-lg font-bold" />
        <HeaderNav className="min-w-0" />
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {user && (
            <UserMenu
              fullName={user.fullName}
              email={user.email}
              avatarUrl={user.avatarUrl}
            />
          )}
        </div>
      </header>
    </>
  );
}
