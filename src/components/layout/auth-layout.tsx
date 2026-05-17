import { AppLogo } from "@/components/layout/app-logo"
import { PageFooter } from "@/components/layout/page-footer"
import Link from "next/link"
import { HelpCircle } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-muted">
      {/* Header */}
      <header className="w-full shrink-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-12 flex justify-between items-center gap-4">
        <AppLogo size="md" />
        <Link
          href="/support"
          className="flex items-center justify-end gap-1 text-right text-sm font-medium leading-tight text-muted-foreground transition-colors hover:text-primary"
        >
          <HelpCircle className="size-4 shrink-0" />
          Trung tâm hỗ trợ
        </Link>
      </header>

      {/* Nội dung chính */}
      <main className="relative flex flex-1 items-center justify-center overflow-x-hidden px-4 py-4 sm:py-6">
        {/* Hoa văn nền nhẹ */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="z-10 w-full max-w-[440px]">
          {children}
        </div>
      </main>

      {/* Footer */}
      <PageFooter variant="simple" />
    </div>
  )
}
