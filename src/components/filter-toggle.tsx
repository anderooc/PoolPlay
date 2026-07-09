"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function filterToggleClassName(pressed: boolean): string {
  return cn(
    "h-auto min-h-9 w-full min-w-0 border px-3 py-1.5 text-xs font-medium leading-snug whitespace-normal text-center",
    pressed
      ? "border-primary bg-primary/10 text-foreground shadow-none"
      : "bg-transparent text-muted-foreground"
  );
}

export function FilterToggle({
  label,
  pressed,
  onClick,
  className,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn(filterToggleClassName(pressed), className)}
      onClick={onClick}
      aria-pressed={pressed}
    >
      {label}
    </Button>
  );
}
