import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name joiner used by shadcn/ui components and anything new.
 *
 * The repo's pre-existing primitives call `clsx` directly, which is fine and
 * stays as-is. `cn` adds tailwind-merge on top, so a later class wins over an
 * earlier conflicting one (`px-2` then `px-4` collapses to `px-4`) instead of
 * both landing and letting specificity decide. That matters for shadcn's
 * variant pattern, where a caller's `className` is expected to override the
 * variant's own utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
