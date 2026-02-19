"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  onOpenChange: () => {},
})

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function DropdownMenu({ open: controlledOpen, onOpenChange, children }: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ onClick, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DropdownMenuContext)

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={(e) => {
          onClick?.(e)
          onOpenChange(!open)
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "center", children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DropdownMenuContext)
    const contentRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
      if (!open) return

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.parentElement?.contains(e.target as Node)) {
          onOpenChange(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, onOpenChange])

    if (!open) return null

    return (
      <div
        ref={(node) => {
          contentRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        className={cn(
          "absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className
        )}
        role="menu"
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DropdownMenuContext)

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        className={cn(
          "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
          inset && "pl-8",
          className
        )}
        onClick={(e) => {
          onClick?.(e)
          onOpenChange(false)
        }}
        {...props}
      />
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    role="separator"
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
