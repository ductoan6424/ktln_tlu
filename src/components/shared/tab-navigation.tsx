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
      <div
        className={cn(
          "flex w-fit gap-1 overflow-x-auto rounded-full border border-border/60 bg-muted/60 p-1",
          className
        )}
      >
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onTabChange(tab.value)}
            className="min-h-8 rounded-full px-4 text-xs font-medium whitespace-nowrap"
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
        "flex gap-1 overflow-x-auto border-b border-border",
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
              "gap-2 rounded-none border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap",
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
