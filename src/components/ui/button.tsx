// Adapted from shadcn/ui's new-york-v4 registry for the existing CSS stack.
import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: { default: "ui-button-default", outline: "ui-button-outline", ghost: "ui-button-ghost", link: "ui-button-link" },
    size: { default: "ui-button-default-size", sm: "ui-button-sm", icon: "ui-button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

function Button({ className, variant = "default", size = "default", asChild = false, ...props }: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
