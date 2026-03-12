"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface Tab {
  label: string
  value: string
  icon?: LucideIcon
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (value: string) => void
  variant?: "underline" | "pill"
  className?: string
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  className,
}: TabNavigationProps) {
  if (variant === "pill") {
    return (
      <div className={cn("flex gap-2 overflow-x-auto", className)}>
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "secondary"}
            size="sm"
            onClick={() => onTabChange(tab.value)}
            className="rounded-full text-xs font-medium whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex border-b border-border overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <Button
            key={tab.value}
            variant="ghost"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "px-4 py-3 rounded-none text-sm font-medium whitespace-nowrap gap-2 border-b-2",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
          </Button>
        )
      })}
    </div>
  )
}
