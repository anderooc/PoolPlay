"use client";

import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Slightly below viewport center so dialogs clear the admin header and tabs. */
export const adminDialogContentClass =
  "top-[calc(50%+1.5rem)] sm:max-w-md";

export function AdminDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(adminDialogContentClass, className)}
      {...props}
    />
  );
}
