import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  variant?: "full" | "centered"
  className?: string
}

const variantStyles = {
  full: "w-full px-4 lg:px-8 py-6",
  centered: "w-full lg:w-[70%] max-w-7xl mx-auto px-4 lg:px-0 py-6",
} as const

export function PageContainer({
  children,
  variant = "centered",
  className,
}: PageContainerProps) {
  return (
    <div className={cn(variantStyles[variant], className)}>
      {children}
    </div>
  )
}
