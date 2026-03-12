import { AppLogo } from "@/components/layout/app-logo"
import { PageFooter } from "@/components/layout/page-footer"
import Link from "next/link"
import { HelpCircle } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-muted">
      {/* Header */}
      <header className="w-full px-6 py-6 lg:px-12 flex justify-between items-center">
        <AppLogo size="md" />
        <Link
          href="/support"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <HelpCircle className="size-4" />
          Trung tâm hỗ trợ
        </Link>
      </header>

      {/* Nội dung chính */}
      <main className="flex-grow flex items-center justify-center px-4 relative overflow-hidden">
        {/* Hoa văn nền nhẹ */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="w-full max-w-[440px] z-10">
          {children}
        </div>
      </main>

      {/* Footer */}
      <PageFooter variant="simple" />
    </div>
  )
}
