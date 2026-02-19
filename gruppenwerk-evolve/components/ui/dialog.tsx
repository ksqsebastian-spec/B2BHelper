"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
})

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
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
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("useDialog must be used within a Dialog")
  }
  return context
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDialog()

    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          onClick?.(e)
          onOpenChange(true)
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = useDialog()

    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false)
        }
      }
      if (open) {
        document.addEventListener("keydown", handleEscape)
        document.body.style.overflow = "hidden"
      }
      return () => {
        document.removeEventListener("keydown", handleEscape)
        document.body.style.overflow = ""
      }
    }, [open, onOpenChange])

    if (!open) return null

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="fixed inset-0 bg-black/80"
          onClick={() => onOpenChange(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            ref={ref}
            className={cn(
              "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
            <button
              type="button"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const { onOpenChange } = useDialog()

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e)
        onOpenChange(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
})
DialogClose.displayName = "DialogClose"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
}
