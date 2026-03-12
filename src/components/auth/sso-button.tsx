"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SsoButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variant?: "primary" | "secondary"
  className?: string
}

export function SsoButton({
  icon: Icon,
  label,
  onClick,
  variant = "primary",
  className,
}: SsoButtonProps) {
  return (
    <Button
      variant={variant === "primary" ? "default" : "outline"}
      size="lg"
      onClick={onClick}
      className={cn(
        "w-full h-12 gap-3 font-semibold",
        variant === "primary" && "shadow-md shadow-primary/20",
        className
      )}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </Button>
  )
}
