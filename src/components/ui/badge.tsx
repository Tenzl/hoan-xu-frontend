// Adapted from shadcn/ui's new-york-v4 registry for the existing CSS stack.
import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ui-badge", {
  variants: { variant: { default: "ui-badge-default", secondary: "ui-badge-secondary", outline: "ui-badge-outline" } },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant = "default", asChild = false, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
