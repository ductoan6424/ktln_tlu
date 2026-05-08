import Link from "next/link"
import type { ReactNode } from "react"

import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"

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
  children: ReactNode
}

export function CommunityManageShell({
  title,
  backHref,
  activeTab,
  tabs,
  children,
}: CommunityManageShellProps) {
  return (
    <PageContainer variant="centered" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <Link href={backHref} className="mt-1 inline-block text-sm text-muted-foreground hover:text-primary">
            Quay lại trang cộng đồng
          </Link>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3">
        {tabs.map((tab) => (
          <Link key={tab.value} href={tab.href}>
            <Button
              size="sm"
              variant={activeTab === tab.value ? "default" : "secondary"}
              className="whitespace-nowrap rounded-full"
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </PageContainer>
  )
}
