// Adapted from shadcn/ui's new-york-v4 registry; styles live in ui-primitives.css.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card" className={cn("ui-card", className)} {...props} />;
}
function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("ui-card-header", className)} {...props} />;
}
function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("ui-card-title", className)} {...props} />;
}
function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("ui-card-description", className)} {...props} />;
}
function CardAction({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("ui-card-action", className)} {...props} />;
}
function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("ui-card-content", className)} {...props} />;
}
function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("ui-card-footer", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
