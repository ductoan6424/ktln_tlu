"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavbarLinkProps {
  icon?: LucideIcon
  label: string
  href: string
  isActive?: boolean
  className?: string
}

export function NavbarLink({
  icon: Icon,
  label,
  href,
  isActive = false,
  className,
}: NavbarLinkProps) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "relative flex size-12 cursor-pointer items-center justify-center rounded-full transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-primary",
            className
          )}
          render={<Link href={href} />}
        >
          {Icon && <Icon className="size-5" />}
          {/* Thanh indicator dưới */}
          <span
            className={cn(
              "absolute right-3 bottom-1 left-3 h-0.5 rounded-full transition-all",
              isActive
                ? "bg-primary"
                : "bg-transparent"
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
