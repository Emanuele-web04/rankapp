// FILE: skeleton.tsx
// Purpose: Provides the stock shadcn skeleton primitive for loading placeholders.
// Layer: UI primitive
// Exports: Skeleton
// Depends on: cn

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
