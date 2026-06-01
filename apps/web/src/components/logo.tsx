import { Link } from "react-router-dom";
import { BrandWordmark } from "@/components/brand-wordmark";
import { cn } from "@/lib/utils";

const sizePx = {
  sm: 36,
  md: 44,
  lg: 112,
} as const;

type LogoProps = {
  to?: string;
  size?: keyof typeof sizePx;
  showText?: boolean;
  subtitle?: string;
  className?: string;
};

export function Logo({ to, size = "md", showText = true, subtitle, className }: LogoProps) {
  const px = sizePx[size];
  const content = (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      <img
        src="/logo.png"
        alt=""
        width={px}
        height={px}
        className="shrink-0 object-contain"
      />
      {showText && (
        <div className="min-w-0 leading-tight">
          <BrandWordmark
            size="sm"
            className="text-foreground dark:text-white truncate block"
          />
          {subtitle ? (
            <span className="text-xs font-normal text-muted-foreground block">{subtitle}</span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
