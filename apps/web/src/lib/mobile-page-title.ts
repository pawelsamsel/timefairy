import { adminAppNav, mainAppNav, settingsAppNav } from "@/lib/app-navigation";

const mobilePageTitles: { prefix: string; title: string }[] = [
  ...mainAppNav.map((item) => ({ prefix: item.to, title: item.label })),
  ...settingsAppNav.map((item) => ({ prefix: item.to, title: item.label })),
  ...adminAppNav.map((item) => ({ prefix: item.to, title: item.label })),
  { prefix: "/app/admin/settings", title: "System settings" },
];

export function resolveMobilePageTitle(pathname: string): string {
  const match = mobilePageTitles
    .filter((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match?.title ?? "Timefairy";
}
