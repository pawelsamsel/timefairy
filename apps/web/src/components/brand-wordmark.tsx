import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  accentClassName?: string;
};

const sizeClass = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

export function BrandWordmark({
  className,
  size = "md",
  accentClassName = "text-steel-azure",
}: BrandWordmarkProps) {
  return (
    <span className={cn("font-semibold tracking-tight", sizeClass[size], className)}>
      TimeF<span className={cn("font-semibold", accentClassName)}>AI</span>ry
    </span>
  );
}
