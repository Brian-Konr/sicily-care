import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-base font-semibold whitespace-nowrap transition-all active:scale-[0.97] motion-reduce:active:scale-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "border border-input bg-card text-primary shadow-xs active:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground",
        ghost:
          "text-primary active:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
      },
      size: {
        // 本系統：所有尺寸 ≥44px（xs / icon-xs 已移除）
        default: "h-12 px-5 has-[>svg]:px-4 [&_svg:not([class*='size-'])]:size-5",
        sm: "h-11 gap-1.5 px-3 has-[>svg]:px-3",
        lg: "h-14 rounded-lg px-6 text-lg has-[>svg]:px-5 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-11",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
