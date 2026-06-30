import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3.5 text-sm " +
  "[&>svg+div]:translate-y-[-3px] " +
  "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground " +
  "[&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        // Default — neutral informational
        default:
          "bg-background text-foreground border-border",
        // Destructive — error, failure
        destructive:
          "border-destructive/40 bg-destructive/8 text-destructive [&>svg]:text-destructive",
        // Neon — success, confirmation (matches brand green)
        neon:
          "border-neon/30 bg-neon/8 text-foreground [&>svg]:text-neon",
        // Warning — amber, non-critical issue
        warning:
          "border-amber-500/30 bg-amber-500/8 text-foreground [&>svg]:text-amber-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      // Space Grotesk for alert titles — visually distinct from body
      "mb-1 font-heading text-sm font-semibold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
