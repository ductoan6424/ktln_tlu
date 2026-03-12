"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AudienceOption {
  value: string
  label: string
}

const DEFAULT_OPTIONS: AudienceOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "students", label: "Sinh viên" },
  { value: "faculty", label: "Giảng viên" },
]

interface AudienceSelectorProps {
  value: string
  onChange: (value: string) => void
  options?: AudienceOption[]
  className?: string
}

export function AudienceSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className,
}: AudienceSelectorProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "secondary"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full",
            value === option.value && "shadow-md shadow-primary/20"
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
