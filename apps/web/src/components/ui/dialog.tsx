import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-imperial-blue/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogSurfaceClass =
  "bg-white text-imperial-blue border border-imperial-blue-200/90 shadow-2xl ring-1 ring-black/5";

const dialogFieldClass =
  "[&_.text-muted-foreground]:text-french-blue [&_input]:bg-white [&_input]:text-imperial-blue [&_input]:border [&_input]:border-imperial-blue-200 [&_input]:shadow-sm [&_input]:placeholder:text-imperial-blue/45 [&_input]:focus-visible:ring-steel-azure/40 [&_textarea]:bg-white [&_textarea]:text-imperial-blue [&_textarea]:border [&_textarea]:border-imperial-blue-200 [&_textarea]:shadow-sm [&_textarea]:placeholder:text-imperial-blue/45 [&_button[role=combobox]]:bg-white [&_button[role=combobox]]:text-imperial-blue [&_button[role=combobox]]:border [&_button[role=combobox]]:border-imperial-blue-200 [&_button[role=combobox]]:shadow-sm";

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dialog-surface fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-0 p-0 duration-200 overflow-hidden sm:rounded-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        dialogSurfaceClass,
        dialogFieldClass,
        className,
      )}
      {...props}
    >
      <div className="px-4 pt-4 pb-0">{children}</div>
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-imperial-blue/70 transition-colors hover:bg-imperial-blue-50 hover:text-imperial-blue focus:outline-none focus:ring-2 focus:ring-steel-azure/50">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left pb-4", className)}
    {...props}
  />
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4 pb-2", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "dialog-footer flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
      "-mx-4 mt-4 px-4 py-3",
      "bg-imperial-blue-50 border-t border-imperial-blue-200",
      "rounded-b-md",
      "sm:gap-3 [&_button]:min-w-[5.5rem]",
      className,
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight text-imperial-blue", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-french-blue", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
