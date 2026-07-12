"use client";

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
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { navLinks, type NavLink } from "./nav-links";
import { PoolPlayMark } from "./poolplay-mark";
import { useState } from "react";

function navHref(link: NavLink, schoolsHref?: string): string {
  if (link.activePrefix === "/schools" && schoolsHref) return schoolsHref;
  return link.href;
}

function navActive(link: NavLink, pathname: string): boolean {
  if (link.activePrefix) {
    return (
      pathname === link.activePrefix ||
      pathname.startsWith(`${link.activePrefix}/`)
    );
  }
  if (link.exact) return pathname === link.href;
  return pathname.startsWith(link.href);
}

export function MobileNav({
  isAdmin = false,
  schoolsHref,
}: {
  isAdmin?: boolean;
  schoolsHref?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleLinks = navLinks.filter((link) => !link.adminOnly || isAdmin);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" />
        }
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="flex h-14 items-center border-b px-4">
          <PoolPlayMark href="/dashboard" wordmarkClassName="text-lg font-bold" />
        </SheetTitle>
        <nav className="space-y-1 p-3">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const href = navHref(link, schoolsHref);
            const active = navActive(link, pathname);
            return (
              <Link
                key={link.label}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
