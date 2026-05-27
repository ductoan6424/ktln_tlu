import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  Flag,
  MessageCircle,
  Pin,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

import { PageContainer } from "@/components/layout/page-container"
import { cn } from "@/lib/utils"

type CommunityManageTab = {
  value: string
  label: string
  href: string
}

type CommunityManageShellProps = {
  title: string
  backHref: string
  activeTab: string
  tabs: CommunityManageTab[]
  children?: ReactNode
}

const tabIcons: Record<string, LucideIcon> = {
  members: Users,
  requests: ClipboardCheck,
  invites: UserPlus,
  "pending-posts": FileText,
  pinned: Pin,
  reports: Flag,
  rules: ShieldCheck,
  chat: MessageCircle,
  settings: Settings,
}

export function CommunityManageShell({
  title,
  backHref,
  activeTab,
  tabs,
  children,
}: CommunityManageShellProps) {
  const activeTabLabel =
    tabs.find((tab) => tab.value === activeTab)?.label ?? tabs[0]?.label

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <PageContainer
        variant="full"
        className="mx-auto max-w-7xl space-y-4 py-4 sm:py-6"
      >
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="h-20 bg-gradient-to-r from-brand-indigo via-primary to-brand-scarlet" />
          <div className="-mt-6 flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-end gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-card bg-primary/10 text-primary shadow-sm">
                <Settings className="size-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {activeTabLabel}
                </p>
              </div>
            </div>

            <Link
              href={backHref}
              className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Quay lại
            </Link>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-border bg-card p-2 shadow-sm lg:sticky lg:top-4">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {tabs.map((tab) => {
                const Icon = tabIcons[tab.value] ?? Settings
                const isActive = activeTab === tab.value

                return (
                  <Link
                    key={tab.value}
                    href={tab.href}
                    className={cn(
                      "flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-foreground transition hover:bg-muted lg:w-full",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/10",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">{children}</main>
        </div>
      </PageContainer>
    </div>
  )
}
