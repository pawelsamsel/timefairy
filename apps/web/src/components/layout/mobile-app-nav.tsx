import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { mobileBottomNav } from "@/lib/app-navigation";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const mobileNavLinkClass =
  "relative z-10 flex h-12 w-full items-center justify-center transition-colors";

const mobileNavIconClass = (isActive: boolean) =>
  cn("h-6 w-6", isActive ? "text-primary" : "text-slate-400");

export function MobileAppNav() {
  const { openAddLog } = useMobileShell();
  const [dayNav, calendarNav] = mobileBottomNav;

  return (
    <nav
      className="relative z-40 shrink-0 overflow-visible rounded-t-2xl border-t border-border/40 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.08)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="relative mx-auto grid max-w-lg grid-cols-3 items-center px-8 pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-2">
        <NavLink
          to={dayNav.to}
          aria-label={dayNav.label}
          className={mobileNavLinkClass}
        >
          {({ isActive }) => {
            const Icon = dayNav.icon;
            return <Icon className={mobileNavIconClass(isActive)} />;
          }}
        </NavLink>

        <div className="relative z-10 h-12">
          <Button
            type="button"
            size="icon"
            className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-[68%] rounded-full shadow-lg ring-4 ring-white"
            onClick={openAddLog}
            aria-label="Add log"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        <NavLink
          to={calendarNav.to}
          aria-label={calendarNav.label}
          className={mobileNavLinkClass}
        >
          {({ isActive }) => {
            const Icon = calendarNav.icon;
            return <Icon className={mobileNavIconClass(isActive)} />;
          }}
        </NavLink>
      </div>
    </nav>
  );
}
