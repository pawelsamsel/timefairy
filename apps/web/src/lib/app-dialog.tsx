import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type AlertOptions = {
  title: string;
  description: string;
  variant?: "info" | "success" | "error";
};

type AppDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }
  return ctx;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      alertResolveRef.current = resolve;
      setAlertState(options);
    });
  }, []);

  function finishConfirm(result: boolean) {
    confirmResolveRef.current?.(result);
    confirmResolveRef.current = null;
    setConfirmState(null);
  }

  function finishAlert() {
    alertResolveRef.current?.();
    alertResolveRef.current = null;
    setAlertState(null);
  }

  return (
    <AppDialogContext.Provider value={{ confirm, alert }}>
      {children}

      <Dialog open={confirmState != null} onOpenChange={(open) => !open && finishConfirm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription>{confirmState?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="dialogOutline" onClick={() => finishConfirm(false)}>
              {confirmState?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant={confirmState?.destructive ? "destructive" : "default"}
              onClick={() => finishConfirm(true)}
            >
              {confirmState?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alertState != null} onOpenChange={(open) => !open && finishAlert()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{alertState?.title}</DialogTitle>
            <DialogDescription>{alertState?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => finishAlert()}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppDialogContext.Provider>
  );
}
