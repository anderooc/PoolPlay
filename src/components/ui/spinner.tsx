import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Pixel size (width/height) */
  size?: number;
  /** On primary buttons, use light ring */
  variant?: "default" | "onPrimary";
};

/** Ring spinner — reliable visibility across themes */
export function Spinner({
  className,
  size = 40,
  variant = "default",
}: SpinnerProps) {
  const s = `${size}px`;
  return (
    <span
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent",
        variant === "onPrimary"
          ? "border-primary-foreground"
          : "border-primary",
        className
      )}
      style={{ width: s, height: s }}
      aria-hidden
    />
  );
}
