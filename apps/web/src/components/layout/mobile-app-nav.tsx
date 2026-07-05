import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { mobileBottomNav } from "@/lib/app-navigation";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const mobileNavLinkClass = (isActive: boolean) =>
  cn(
    "flex flex-col items-center justify-end gap-0.5 pb-2 pt-1 text-[11px] font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground",
  );

export function MobileAppNav() {
  const { fab } = useMobileShell();
  const [dayNav, calendarNav] = mobileBottomNav;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 overflow-visible rounded-t-2xl border-t border-border/40 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.08)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="relative mx-auto grid max-w-lg grid-cols-3 items-end px-8 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
        <NavLink to={dayNav.to} className={({ isActive }) => mobileNavLinkClass(isActive)}>
          {({ isActive }) => {
            const Icon = dayNav.icon;
            return (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                {dayNav.label}
              </>
            );
          }}
        </NavLink>

        <div className="flex justify-center">
          <div className="h-6 w-14" aria-hidden />
        </div>

        <NavLink to={calendarNav.to} className={({ isActive }) => mobileNavLinkClass(isActive)}>
          {({ isActive }) => {
            const Icon = calendarNav.icon;
            return (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                {calendarNav.label}
              </>
            );
          }}
        </NavLink>
      </div>

      <Button
        type="button"
        size="icon"
        className={cn(
          "absolute left-1/2 top-0 z-10 h-14 w-14 -translate-x-1/2 -translate-y-[18%] rounded-full shadow-lg ring-4 ring-white",
          !fab && "opacity-40",
        )}
        disabled={!fab}
        onClick={() => fab?.onClick()}
        aria-label={fab?.ariaLabel ?? "Add"}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </nav>
  );
}
