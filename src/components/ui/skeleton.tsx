// Adapted from shadcn/ui's new-york-v4 registry for the existing CSS stack.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("ui-skeleton", className)} {...props} />;
}
