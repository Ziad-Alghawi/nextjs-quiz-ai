import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The "neo" buttons (landing page and quiz player) stand on a 7px ledge drawn as a box-shadow;
// they go away when those screens are redesigned.
const neoClasses =
  "w-full rounded-full px-3.5 py-5 border-2 text-lg font-bold hover:-translate-y-0.5 transition-transform duration-200";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        neo: cn(
          neoClasses,
          "bg-primary text-primary-foreground border-blue-900 shadow-[0_7px_0_var(--color-primary-shadow)]",
        ),
        neoOutline: cn(
          neoClasses,
          "bg-[#3e406a] text-white border-[#6366a7] shadow-[0_7px_0_#6366a7]",
        ),
        neoSuccess: cn(
          neoClasses,
          "bg-green-500 text-primary-foreground border-green-600 shadow-[0_7px_0_var(--color-green-600)]",
        ),
        neoDanger: cn(
          neoClasses,
          "bg-red-500 text-primary-foreground border-red-600 shadow-[0_7px_0_var(--color-red-600)]",
        ),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-14 rounded-full px-3.5 py-5",
        xl: "h-16 rounded-2xl px-6 py-3",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element (e.g. a Link) with the button styles instead of a <button>. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button };
