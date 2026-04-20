import { cn } from "@/lib/utils"

const SIZE_MAP = {
  sm: { logo: 24, text: "text-base" },
  md: { logo: 32, text: "text-lg" },
  lg: { logo: 40, text: "text-xl" },
} as const

interface AppLogoProps {
  variant?: "full" | "icon-only"
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function AppLogo({
  variant = "full",
  size = "md",
  className,
}: AppLogoProps) {
  const { logo, text } = SIZE_MAP[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Dùng img thuần cho SVG vì Next.js Image không tối ưu tốt file SVG local */}
      <img
        src="/logo.svg"
        alt="TLU Community"
        width={logo}
        height={logo}
        className="shrink-0"
      />
      {variant === "full" && (
        <h1 className={cn(text, "font-bold tracking-tight text-foreground leading-none")}>
          TLU Community
        </h1>
      )}
    </div>
  )
}
