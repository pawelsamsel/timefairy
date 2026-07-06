import { Menu } from "lucide-react";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { Button } from "@/components/ui/button";

export function MobileMenuButton() {
  const { openMenu } = useMobileShell();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="fixed z-30 h-10 w-10 md:hidden left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))]"
      onClick={openMenu}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
