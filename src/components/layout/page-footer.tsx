import { AppLogo } from "@/components/layout/app-logo"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterLink {
  label: string
  href: string
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: "Chính sách bảo mật", href: "/privacy" },
  { label: "Điều khoản", href: "/terms" },
  { label: "Hỗ trợ", href: "/support" },
]

const COPYRIGHT_YEAR = new Date().getFullYear()

interface PageFooterProps {
  variant?: "simple" | "full"
  links?: FooterLink[]
  className?: string
}

export function PageFooter({
  variant = "simple",
  links = DEFAULT_LINKS,
  className,
}: PageFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-border/70 bg-card/95 py-8",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        {variant === "full" ? (
          <AppLogo size="sm" />
        ) : (
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            © {COPYRIGHT_YEAR} TLU Community. Mọi quyền được bảo lưu.
          </p>
        )}
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {variant === "full" && (
        <p className="mt-4 text-center text-xs text-muted-foreground" suppressHydrationWarning>
          © {COPYRIGHT_YEAR} TLU Community. Mọi quyền được bảo lưu.
        </p>
      )}
    </footer>
  )
}
