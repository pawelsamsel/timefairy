import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const MOBILE_SHELL_HEADER_BAR_CLASS =
  "grid h-16 grid-cols-[auto_1fr_auto] items-center gap-0.5 border-b border-steel-azure bg-white ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))]";

export const MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS = "h-9 w-9 shrink-0";

export const MOBILE_SHELL_HEADER_ICON_CLASS = "h-[1.125rem] w-[1.125rem]";

export const MOBILE_CONTENT_SURFACE_CLASS = "bg-imperial-blue-50";

type MobilePageHeaderProps = {
  title: string;
  trailing?: ReactNode;
  className?: string;
};

export function MobilePageHeader({ title, trailing, className }: MobilePageHeaderProps) {
  const { openMenu } = useMobileShell();

  return (
    <div className={cn("relative shrink-0 bg-white", className)}>
      <div className={MOBILE_SHELL_HEADER_BAR_CLASS}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS}
          onClick={openMenu}
          aria-label="Open menu"
        >
          <Menu className={MOBILE_SHELL_HEADER_ICON_CLASS} />
        </Button>

        <h1 className="truncate px-1 text-center text-base font-semibold leading-none tracking-tight">
          {title}
        </h1>

        <div className="flex min-w-0 items-center justify-end">{trailing ?? <span className="h-9 w-9 shrink-0" aria-hidden />}</div>
      </div>
    </div>
  );
}
