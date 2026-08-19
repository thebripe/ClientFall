import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        // Warm sand — reserved for the single primary action on a screen.
        default:
          "bg-primary text-primary-foreground shadow-sm hover:brightness-108 active:brightness-95",
        outline:
          "border border-border-strong bg-transparent text-foreground/90 hover:bg-secondary hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-raised",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        destructive:
          "border border-urgent-border bg-urgent-surface text-urgent hover:bg-urgent-surface hover:brightness-125",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 gap-1.5 px-2.5",
        lg: "h-10 px-5 text-sm",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
