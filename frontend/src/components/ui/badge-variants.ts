import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  // Base: consistent pill shape, monospace font to match the terminal aesthetic
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-code text-xs font-medium " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        // Primary — purple/blue brand colour
        default:
          "border-transparent bg-primary text-primary-foreground",
        // Secondary — muted surface
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        // Destructive — red, for errors and danger states
        destructive:
          "border-transparent bg-destructive/15 text-destructive border-destructive/30",
        // Outline — transparent fill, visible border
        outline:
          "text-foreground border-border",
        // Neon — brand green, for success / active / online states
        neon:
          "border-neon/30 bg-neon/10 text-neon",
        // Warning — amber, for pending / in-review states
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        // Success — explicit green for resolved/complete
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
