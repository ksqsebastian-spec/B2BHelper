"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, defaultChecked, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
    const isControlled = checked !== undefined
    const isChecked = isControlled ? checked : internalChecked

    return (
      <label
        className={cn(
          "relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary shadow focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
          isChecked && "bg-primary text-primary-foreground",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          className="sr-only"
          checked={isChecked}
          onChange={(e) => {
            if (!isControlled) {
              setInternalChecked(e.target.checked)
            }
            onCheckedChange?.(e.target.checked)
          }}
          {...props}
        />
        {isChecked && <Check className="h-3 w-3" />}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
