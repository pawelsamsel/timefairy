import type { ComponentType } from "react";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Columns3,
  Database,
  ListTodo,
  User,
  Users,
} from "lucide-react";

export type AppNavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const mainAppNav: AppNavItem[] = [
  { to: "/app/dashboard", label: "Day", icon: CalendarDays },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/tasks", label: "Tasks", icon: ListTodo },
  { to: "/app/clients", label: "Clients", icon: Building2 },
  { to: "/app/projects", label: "Projects", icon: Briefcase },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
];

export const settingsAppNav: AppNavItem[] = [
  { to: "/app/settings/profile", label: "Profile", icon: User },
  { to: "/app/settings/work-hours", label: "Work hours", icon: Clock },
  { to: "/app/settings/lanes", label: "Lanes", icon: Columns3 },
  { to: "/app/settings/data", label: "Manage Data", icon: Database },
];

export const adminAppNav: AppNavItem[] = [{ to: "/app/admin/users", label: "Users", icon: Users }];

export const mobileBottomNav: AppNavItem[] = [
  { to: "/app/dashboard", label: "Day", icon: CalendarDays },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
];
