// FILE: utils.ts
// Purpose: Hosts shared utility helpers used by shadcn component primitives.
// Layer: Utility
// Exports: cn
// Depends on: clsx, tailwind-merge

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
