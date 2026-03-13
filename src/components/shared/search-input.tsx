import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  placeholder?: string
  className?: string
  value?: string
  onChange?: (value: string) => void
  autoFocus?: boolean
}

export function SearchInput({
  placeholder = "Tìm kiếm...",
  className,
  value,
  onChange,
  autoFocus,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        autoFocus={autoFocus}
        className="pl-9 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary/50 h-9 text-sm"
      />
    </div>
  )
}

