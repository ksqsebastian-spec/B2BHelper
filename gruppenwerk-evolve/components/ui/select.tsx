"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export interface SelectOptionProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <option
        ref={ref}
        className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none", className)}
        {...props}
      />
    )
  }
)
SelectOption.displayName = "SelectOption"

export interface SelectGroupProps
  extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {}

const SelectGroup = React.forwardRef<HTMLOptGroupElement, SelectGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <optgroup
        ref={ref}
        className={cn("font-semibold", className)}
        {...props}
      />
    )
  }
)
SelectGroup.displayName = "SelectGroup"

export { Select, SelectOption, SelectGroup }
