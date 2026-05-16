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
        "border-t border-border py-8 bg-card",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        {variant === "full" ? (
          <AppLogo size="sm" />
        ) : (
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            © {new Date().getFullYear()} TLU Community. Mọi quyền được bảo lưu.
          </p>
        )}
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {variant === "full" && (
        <p className="text-xs text-muted-foreground text-center mt-4" suppressHydrationWarning>
          © {new Date().getFullYear()} TLU Community. Mọi quyền được bảo lưu.
        </p>
      )}
    </footer>
  )
}
