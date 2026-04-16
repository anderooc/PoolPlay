import Link from "next/link";
import { cn } from "@/lib/utils";

type PoolPlayMarkProps = {
  /** If set, wraps the wordmark in a link */
  href?: string;
  className?: string;
  /** Classes on the inner wordmark (Pool + Play) */
  wordmarkClassName?: string;
};

/**
 * Brand wordmark: "PoolPlay" as one word — Pool (primary/red), Play (secondary/blue).
 */
export function PoolPlayMark({
  href,
  className,
  wordmarkClassName,
}: PoolPlayMarkProps) {
  const wordmark = (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap font-extrabold tracking-tight",
        wordmarkClassName
      )}
    >
      <span className="text-primary">Pool</span>
      <span className="text-secondary">Play</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cn("shrink-0", className)}>
        {wordmark}
      </Link>
    );
  }

  return <span className={className}>{wordmark}</span>;
}
