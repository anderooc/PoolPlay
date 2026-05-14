import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Path without query string, e.g. `/admin/users` */
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}

export function AdminTablePagination({
  basePath,
  page,
  pageSize,
  total,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  function hrefFor(p: number) {
    if (p <= 1) return basePath;
    return `${basePath}?page=${p}`;
  }

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
            href={hrefFor(safePage - 1)}
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
            href={hrefFor(safePage + 1)}
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
