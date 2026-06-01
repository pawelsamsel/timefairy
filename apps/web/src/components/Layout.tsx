import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Shield, ArrowLeft, ChevronUp, LogOut, Settings } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAppMode } from "../lib/app-mode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/logo";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-lg px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-primary/15 text-primary font-medium"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

const appNav = [
  { to: "/app/dashboard", label: "Day" },
  { to: "/app/tasks", label: "Tasks" },
  { to: "/app/clients", label: "Clients" },
  { to: "/app/projects", label: "Projects" },
  { to: "/app/reports", label: "Reports" },
] as const;

const settingsNav = [
  { to: "/app/settings/profile", label: "Profile" },
  { to: "/app/settings/lanes", label: "Lanes" },
  { to: "/app/settings/data", label: "Manage Data" },
] as const;

const adminNav = [{ to: "/app/admin/users", label: "Users" }] as const;

const menuItemClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground";

export function Layout() {
  const { user, logout } = useAuth();
  const { isAdminMode, canUseAdminMode, enterAdminMode, exitAdminMode } = useAppMode();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const isSettingsArea = !isAdminMode && location.pathname.startsWith("/app/settings");
  const homeTo = isAdminMode ? "/app/admin/users" : "/app/dashboard";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-border/30 p-4 flex flex-col gap-6">
        <Logo to={homeTo} subtitle={isAdminMode ? "Admin" : isSettingsArea ? "Settings" : undefined} />

        {isAdminMode ? (
          <nav className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : isSettingsArea ? (
          <nav className="flex flex-col gap-1">
            <Button variant="outline" className="w-full justify-start gap-2 px-3 mb-2" asChild>
              <Link to="/app/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to app
              </Link>
            </Button>
            {settingsNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <nav className="flex flex-col gap-1">
            {appNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="mt-auto pt-4 border-t border-border/30 space-y-2">
          {canUseAdminMode && (
            <>
              {isAdminMode ? (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 px-3"
                  onClick={exitAdminMode}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to app
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 px-3"
                  onClick={enterAdminMode}
                >
                  <Shield className="h-4 w-4" />
                  Admin mode
                </Button>
              )}
            </>
          )}
          {!isAdminMode && !isSettingsArea && (
            <Button variant="outline" className="w-full justify-start gap-2 px-3" asChild>
              <Link to="/app/settings/profile">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          {isAdminMode && canUseAdminMode && (
            <Button variant="outline" className="w-full justify-start gap-2 px-3" asChild>
              <Link to="/app/admin/settings">
                <Settings className="h-4 w-4" />
                System settings
              </Link>
            </Button>
          )}
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between gap-2 px-3 text-left font-normal"
                aria-label="Account menu"
              >
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              <button
                type="button"
                className={cn(menuItemClass, "text-destructive hover:text-destructive")}
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
