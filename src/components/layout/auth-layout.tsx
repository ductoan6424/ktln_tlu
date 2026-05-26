import { AppLogo } from "@/components/layout/app-logo"
import { PageFooter } from "@/components/layout/page-footer"
import Link from "next/link"
import { HelpCircle } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(360px,44%)_1fr]">
        <aside className="brand-panel relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute inset-0 tlu-geometry opacity-55" />
          <div className="relative">
            <AppLogo size="md" className="[&_h1]:text-white" />
          </div>
          <div className="relative max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              TLU Community
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
              Cộng đồng Đại học Thăng Long
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Kết nối học tập, hoạt động và thông báo chính thức trong một
              không gian đáng tin cậy.
            </p>
          </div>
          <p className="relative text-xs font-medium text-white/60">
            Đại học Thăng Long
          </p>
        </aside>

        <section className="flex min-h-dvh flex-col">
          <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8 lg:px-10">
            <AppLogo size="sm" className="lg:hidden" />
            <div className="hidden lg:block" aria-hidden="true" />
            <Link
              href="/support"
              className="flex items-center justify-end gap-1.5 text-right text-sm font-medium leading-tight text-muted-foreground transition-colors hover:text-primary"
            >
              <HelpCircle className="size-4 shrink-0" />
              Trung tâm hỗ trợ
            </Link>
          </header>

          <main className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-8">
            <div className="w-full max-w-[460px]">
              {children}
            </div>
          </main>

          <PageFooter variant="simple" className="bg-transparent" />
        </section>
      </div>
    </div>
  )
}
