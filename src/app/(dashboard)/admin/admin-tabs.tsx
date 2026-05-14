"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Trophy, Group, Flag, Gauge } from "lucide-react";
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
  { href: "/admin/teams", label: "Teams", icon: Group },
  { href: "/admin/flags", label: "Content flags", icon: Flag },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b text-sm"
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
              "inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 font-medium text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground",
              active && "border-primary text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
