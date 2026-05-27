"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

interface SidebarNavItemProps {
  icon: LucideIcon
  label: string
  href: string
  isActive?: boolean
  badge?: number
  className?: string
}

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  isActive = false,
  badge,
  className,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="official"
          className="ml-auto flex size-5 items-center justify-center rounded-full bg-official p-0 text-[10px] font-bold text-white"
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </Link>
  )
}
