import * as React from "react"

import { cn } from "@/lib/utils"

export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayDuration?: number
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, content, side = "top", children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("group relative inline-flex", className)} {...props}>
        {children}
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md group-hover:block",
            side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
            side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
            side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2"
          )}
        >
          {content}
        </div>
      </div>
    )
  }
)
Tooltip.displayName = "Tooltip"

export { Tooltip }
