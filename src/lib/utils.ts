import { clsx, type ClassValue } from "clsx";

// CSS classes are used instead of Tailwind in this project.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
