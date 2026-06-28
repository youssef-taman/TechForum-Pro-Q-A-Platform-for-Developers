import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  // Base: all buttons share these traits
  // min-h ensures WCAG 2.5.8 minimum target size (24px; we use 36px+)
  // gap-2 between icon and label, font-medium for legibility
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action — use sparingly, one per view
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        // Destructive — delete, remove, ban
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        // Secondary action — bordered, lower visual weight than default
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        // Tertiary action — filled muted background
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // Ghost — no background until hover; use in toolbars and nav
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        // Link style — underline on hover, no background
        link:
          "text-primary underline-offset-4 hover:underline",
        // Neon accent — primary CTA variant with the brand green
        neon:
          "bg-neon/90 text-black font-semibold shadow-sm hover:bg-neon active:scale-[0.98]",
      },
      size: {
        // Default: 40px height — comfortable click target
        default: "h-10 px-4 py-2",
        // Small: 32px — for inline actions, badges, toolbar buttons
        sm:      "h-8 rounded-md px-3 text-xs",
        // Large: 44px — primary CTAs, form submit buttons
        lg:      "h-11 rounded-lg px-6 text-base",
        // Icon: square button, no padding
        icon:    "h-9 w-9",
        // Icon small: for toolbars, compact UIs
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
