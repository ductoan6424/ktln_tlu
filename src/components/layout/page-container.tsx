import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  variant?: "full" | "centered"
  className?: string
}

const variantStyles = {
  full: "mx-auto w-full max-w-7xl px-4 py-5 lg:px-8",
  centered: "mx-auto w-full max-w-7xl px-4 py-5 lg:w-[70%] lg:px-0",
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
