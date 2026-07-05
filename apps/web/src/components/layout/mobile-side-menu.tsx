import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAppMode } from "@/lib/app-mode";
import { useMobileShell } from "@/lib/mobile-shell-context";
import {
  adminAppNav,
  mainAppNav,
  settingsAppNav,
  type AppNavItem,
} from "@/lib/app-navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
    isActive
      ? "bg-primary/15 text-primary font-medium"
      : "text-foreground/90 hover:bg-accent hover:text-accent-foreground",
  );

function DrawerNavLink({
  item,
  onNavigate,
}: {
  item: AppNavItem;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink to={item.to} className={drawerLinkClass} onClick={onNavigate}>
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  );
}

export function MobileSideMenu() {
  const { user, logout } = useAuth();
  const { isAdminMode, canUseAdminMode, enterAdminMode, exitAdminMode } = useAppMode();
  const { menuOpen, closeMenu } = useMobileShell();
  const location = useLocation();
  const isSettingsArea = !isAdminMode && location.pathname.startsWith("/app/settings");
  const homeTo = isAdminMode ? "/app/admin/users" : "/app/dashboard";

  if (!menuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close menu"
        onClick={closeMenu}
      />

      <aside className="absolute inset-y-0 left-0 flex w-[min(18.5rem,88vw)] flex-col border-r border-border/40 bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3">
          <Link to={homeTo} onClick={closeMenu} className="min-w-0 flex-1 hover:opacity-90">
            <Logo
              size="sm"
              showText
              subtitle={isAdminMode ? "Admin" : isSettingsArea ? "Settings" : undefined}
            />
          </Link>
          <Button type="button" variant="ghost" size="icon" onClick={closeMenu} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {isAdminMode ? (
            adminAppNav.map((item) => (
              <DrawerNavLink key={item.to} item={item} onNavigate={closeMenu} />
            ))
          ) : isSettingsArea ? (
            <>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link to="/app/dashboard" onClick={closeMenu}>
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  Back to app
                </Link>
              </Button>
              {settingsAppNav.map((item) => (
                <DrawerNavLink key={item.to} item={item} onNavigate={closeMenu} />
              ))}
            </>
          ) : (
            mainAppNav.map((item) => (
              <DrawerNavLink key={item.to} item={item} onNavigate={closeMenu} />
            ))
          )}
        </nav>

        <div className="space-y-2 border-t border-border/30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {canUseAdminMode && !isSettingsArea && (
            isAdminMode ? (
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { exitAdminMode(); closeMenu(); }}>
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Back to app
              </Button>
            ) : (
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { enterAdminMode(); closeMenu(); }}>
                <Shield className="h-4 w-4 shrink-0" />
                Admin mode
              </Button>
            )
          )}

          {!isAdminMode && !isSettingsArea && (
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/app/settings/profile" onClick={closeMenu}>
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => {
              closeMenu();
              logout();
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </Button>
        </div>
      </aside>
    </div>
  );
}
