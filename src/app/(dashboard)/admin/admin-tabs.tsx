"use client";

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

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Trophy, Group, Flag, Gauge, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminTabUrl, parseAdminTab, type AdminTabId } from "./constants";

const adminNav: {
  tab: AdminTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "overview", label: "Overview", icon: Gauge },
  { tab: "users", label: "Users", icon: Users },
  { tab: "tournaments", label: "Tournaments", icon: Trophy },
  { tab: "schools", label: "Schools", icon: Building2 },
  { tab: "teams", label: "Teams", icon: Group },
  { tab: "flags", label: "Content flags", icon: Flag },
];

export function AdminTabs() {
  const searchParams = useSearchParams();
  const activeTab = parseAdminTab(searchParams.get("tab") ?? undefined);

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border/70 text-sm"
      aria-label="Admin sections"
    >
      {adminNav.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.tab;
        return (
          <Link
            key={item.tab}
            href={adminTabUrl(item.tab)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
