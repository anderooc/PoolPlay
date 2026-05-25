"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Trophy, Group, Flag, Gauge, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminTabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const adminNav: AdminTabItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/admin/schools", label: "Schools", icon: Building2 },
  { href: "/admin/teams", label: "Teams", icon: Group },
  { href: "/admin/flags", label: "Content flags", icon: Flag },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-border/60 pb-2 text-sm"
      aria-label="Admin sections"
    >
      {adminNav.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-primary-foreground" : "text-current"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
