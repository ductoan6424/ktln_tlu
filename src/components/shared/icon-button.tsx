"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface IconButtonProps {
  icon: LucideIcon
  variant?: "ghost" | "outline" | "primary"
  size?: "sm" | "md" | "lg"
  badge?: number
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

const SIZE_MAP = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
} as const

const ICON_SIZE_MAP = {
  sm: "size-4",
  md: "size-5",
  lg: "size-5",
} as const

export function IconButton({
  icon: Icon,
  variant = "ghost",
  size = "md",
  badge,
  onClick,
  className,
  ariaLabel,
}: IconButtonProps) {
  const buttonVariant = variant === "primary" ? "default" : variant

  return (
    <Button
      variant={buttonVariant}
      size="icon"
      onClick={onClick}
      className={cn(
        "relative rounded-lg",
        SIZE_MAP[size],
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label={ariaLabel}
    >
      <Icon className={ICON_SIZE_MAP[size]} />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Button>
  )
}
