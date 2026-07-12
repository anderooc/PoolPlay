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
import { adminTabUrl, type AdminTabId } from "./constants";

interface Props {
  tab: AdminTabId;
  page: number;
  pageSize: number;
  total: number;
}

export function AdminTablePagination({ tab, page, pageSize, total }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        {total === 0 ? (
          "No rows."
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-foreground tabular-nums">
              {start}&ndash;{end}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground tabular-nums">
              {total}
            </span>
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Link
            href={adminTabUrl(tab, safePage - 1)}
            aria-disabled={safePage <= 1}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              safePage <= 1 && "pointer-events-none opacity-50"
            )}
          >
            Previous
          </Link>
          <span className="tabular-nums text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Link
            href={adminTabUrl(tab, safePage + 1)}
            aria-disabled={safePage >= totalPages}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              safePage >= totalPages && "pointer-events-none opacity-50"
            )}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
