import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Toasts are for background events and success confirmations only.
// Form validation errors should be shown inline, not via toast.
// See: login.tsx, register.tsx, etc. — use local `formError` state instead.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:font-sans",
          title:
            "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description:
            "group-[.toast]:text-xs group-[.toast]:text-muted-foreground group-[.toast]:mt-0.5",
          // Success: neon green left border
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-neon group-[.toaster]:bg-card",
          // Error: destructive left border — only used for non-form errors
          // (e.g. background network failures, server-sent events losing connection)
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive group-[.toaster]:bg-card",
          // Info / warning
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary group-[.toaster]:bg-card",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500 group-[.toaster]:bg-card",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-code group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-code group-[.toast]:rounded-md",
          closeButton:
            "group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
