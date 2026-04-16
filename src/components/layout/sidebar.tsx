"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks } from "./nav-links";
import { Button } from "@/components/ui/button";

const SIDEBAR_COLLAPSED_KEY = "poolplay-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden min-h-0 md:flex md:min-h-0 md:flex-col md:border-r md:bg-sidebar md:transition-[width] md:duration-200 md:ease-out",
        collapsed ? "md:w-[4.25rem]" : "md:w-60"
      )}
    >
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={hydrated && collapsed ? link.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "flex shrink-0 border-t border-sidebar-border py-2",
          collapsed ? "justify-center px-1" : "justify-end px-2"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0 border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
