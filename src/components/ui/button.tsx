import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-secondary underline-offset-4 hover:underline",
        accent: "bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:scale-[0.98]",
        accentSoft: "bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 hover:border-secondary/40",
        glass: "bg-white/5 backdrop-blur-sm border border-white/10 text-foreground hover:bg-white/10 hover:border-white/20",
        dark: "bg-muted text-foreground border border-border hover:bg-muted/80",
        institutional: "bg-primary text-primary-foreground font-bold hover:bg-primary/85 active:scale-[0.98] rounded-full",
      },
      size: {
        default: "h-10 px-5 rounded-full",
        sm: "h-9 px-4 text-sm rounded-full",
        lg: "h-12 px-6 text-base rounded-full",
        xl: "h-14 px-8 text-base font-semibold rounded-full",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
