import { useEffect, useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ChevronUp,
  Clock,
  Columns3,
  Database,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAppMode } from "../lib/app-mode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/logo";

const SIDEBAR_COLLAPSED_KEY = "timefairy-sidebar-collapsed";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navLinkClass = ({ isActive }: { isActive: boolean }, collapsed: boolean) =>
  cn(
    "flex items-center rounded-lg text-sm transition-colors",
    collapsed ? "justify-center p-1.5" : "gap-2 px-2.5 py-1.5",
    isActive
      ? "bg-primary/15 text-primary font-medium"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

const appNav: NavItem[] = [
  { to: "/app/dashboard", label: "Day", icon: CalendarDays },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/tasks", label: "Tasks", icon: ListTodo },
  { to: "/app/clients", label: "Clients", icon: Building2 },
  { to: "/app/projects", label: "Projects", icon: Briefcase },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
];

const settingsNav: NavItem[] = [
  { to: "/app/settings/profile", label: "Profile", icon: User },
  { to: "/app/settings/work-hours", label: "Work hours", icon: Clock },
  { to: "/app/settings/lanes", label: "Lanes", icon: Columns3 },
  { to: "/app/settings/data", label: "Manage Data", icon: Database },
];

const adminNav: NavItem[] = [{ to: "/app/admin/users", label: "Users", icon: Users }];

const menuItemClass =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground";

function loadSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function SidebarNavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;

  return (
    <NavLink
      key={item.to}
      to={item.to}
      className={(state) => navLinkClass(state, collapsed)}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const { isAdminMode, canUseAdminMode, enterAdminMode, exitAdminMode } = useAppMode();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadSidebarCollapsed());
  const location = useLocation();
  const isSettingsArea = !isAdminMode && location.pathname.startsWith("/app/settings");
  const homeTo = isAdminMode ? "/app/admin/users" : "/app/dashboard";
  const logoSubtitle = isAdminMode ? "Admin" : isSettingsArea ? "Settings" : undefined;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <aside
        className={cn(
          "shrink-0 border-r border-border/30 p-3 flex flex-col gap-4 transition-[width] duration-200",
          sidebarCollapsed ? "w-14" : "w-[12.5rem]",
        )}
      >
        <div className={cn("flex items-center gap-1", sidebarCollapsed ? "justify-center" : "justify-between")}>
          <Logo
            to={homeTo}
            size="sm"
            showText={!sidebarCollapsed}
            subtitle={sidebarCollapsed ? undefined : logoSubtitle}
            className={sidebarCollapsed ? "justify-center" : undefined}
            title={sidebarCollapsed ? logoSubtitle ?? "Timefairy" : undefined}
          />
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-md border border-border/40 bg-muted/30 text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto h-8 w-8 rounded-md border border-border/40 bg-muted/30 text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {isAdminMode ? (
          <nav className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        ) : isSettingsArea ? (
          <nav className="flex flex-col gap-1">
            <Button
              variant="outline"
              className={cn(
                "w-full gap-2",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-3",
              )}
              asChild
              title={sidebarCollapsed ? "Back to app" : undefined}
            >
              <Link to="/app/dashboard">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && "Back to app"}
              </Link>
            </Button>
            {settingsNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        ) : (
          <nav className="flex flex-col gap-1">
            {appNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        )}

        <div className="mt-auto pt-4 border-t border-border/30 space-y-2">
          {canUseAdminMode && (
            <>
              {isAdminMode ? (
                <Button
                  variant="outline"
                  className={cn(
                    "w-full gap-2",
                    sidebarCollapsed ? "justify-center px-0" : "justify-start px-3",
                  )}
                  onClick={exitAdminMode}
                  title={sidebarCollapsed ? "Back to app" : undefined}
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && "Back to app"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className={cn(
                    "w-full gap-2",
                    sidebarCollapsed ? "justify-center px-0" : "justify-start px-3",
                  )}
                  onClick={enterAdminMode}
                  title={sidebarCollapsed ? "Admin mode" : undefined}
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && "Admin mode"}
                </Button>
              )}
            </>
          )}
          {!isAdminMode && !isSettingsArea && (
            <Button
              variant="outline"
              className={cn(
                "w-full gap-2",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-3",
              )}
              asChild
              title={sidebarCollapsed ? "Settings" : undefined}
            >
              <Link to="/app/settings/profile">
                <Settings className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && "Settings"}
              </Link>
            </Button>
          )}
          {isAdminMode && canUseAdminMode && (
            <Button
              variant="outline"
              className={cn(
                "w-full gap-2",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-3",
              )}
              asChild
              title={sidebarCollapsed ? "System settings" : undefined}
            >
              <Link to="/app/admin/settings">
                <Settings className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && "System settings"}
              </Link>
            </Button>
          )}
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full font-normal",
                  sidebarCollapsed
                    ? "justify-center px-0"
                    : "justify-between gap-2 px-3 text-left",
                )}
                aria-label="Account menu"
                title={sidebarCollapsed ? user?.email : undefined}
              >
                {sidebarCollapsed ? (
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align={sidebarCollapsed ? "center" : "start"} className="w-[9rem] p-1">
              {sidebarCollapsed && (
                <div className="truncate px-3 py-2 text-xs text-muted-foreground border-b border-border/30 mb-1">
                  {user?.email}
                </div>
              )}
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
      <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
