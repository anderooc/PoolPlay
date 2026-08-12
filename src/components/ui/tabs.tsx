"use client"

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

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // Horizontal: list above panels. Vertical: list beside panels.
        "group/tabs flex gap-2",
        orientation === "vertical" ? "flex-row" : "flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center text-muted-foreground",
  {
    variants: {
      variant: {
        default:
          "h-8 w-fit justify-center rounded-lg bg-muted p-[3px]",
        /** Compact underline row for division pickers. */
        line: "h-auto w-full justify-start gap-0 rounded-none border-b border-border/70 bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        "hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Pill (default)
        "group-data-[variant=default]/tabs-list:h-[calc(100%-1px)]",
        "group-data-[variant=default]/tabs-list:flex-1",
        "group-data-[variant=default]/tabs-list:rounded-md",
        "group-data-[variant=default]/tabs-list:px-1.5",
        "group-data-[variant=default]/tabs-list:py-0.5",
        "group-data-[variant=default]/tabs-list:text-foreground/60",
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30",
        "dark:group-data-[variant=default]/tabs-list:text-muted-foreground",
        "dark:group-data-[variant=default]/tabs-list:hover:text-foreground",
        // Line: compact natural-width underline
        "group-data-[variant=line]/tabs-list:-mb-px",
        "group-data-[variant=line]/tabs-list:flex-none",
        "group-data-[variant=line]/tabs-list:rounded-none",
        "group-data-[variant=line]/tabs-list:border-b-2",
        "group-data-[variant=line]/tabs-list:border-transparent",
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:px-2.5",
        "group-data-[variant=line]/tabs-list:py-2",
        "group-data-[variant=line]/tabs-list:text-muted-foreground",
        "group-data-[variant=line]/tabs-list:shadow-none",
        "group-data-[variant=line]/tabs-list:data-active:border-foreground",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:data-active:shadow-none",
        "dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
