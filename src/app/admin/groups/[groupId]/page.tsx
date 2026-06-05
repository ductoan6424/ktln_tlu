import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminGroupMembersPanel } from "@/components/admin/groups/admin-group-members-panel"
import { AdminDetailSection } from "@/components/admin/module/admin-detail-section"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminGroupDetail } from "@/lib/admin/groups/groups-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const detail = await getAdminGroupDetail(groupId)

  if (!detail) notFound()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={detail.group.name}
        description={detail.group.description ?? "Quản lý nhóm và thành viên"}
        primaryAction={{ label: "Chỉnh sửa nhóm", href: `/admin/groups/${detail.group.id}/edit` }}
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/groups", variant: "outline" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {detail.detailSections.map((section) => (
            <AdminDetailSection key={section.title} section={section} />
          ))}
          <AdminGroupMembersPanel groupId={detail.group.id} members={detail.members} />
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-semibold">Thao tác nhanh</p>
            <Link href={`/admin/groups/${detail.group.id}/edit`} className={buttonVariants({ className: "w-full" })}>
              Sửa nhóm
            </Link>
            <Link href={detail.group.href} className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Mở trang nhóm
            </Link>
            <Link href="/admin/groups" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Danh sách nhóm
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
