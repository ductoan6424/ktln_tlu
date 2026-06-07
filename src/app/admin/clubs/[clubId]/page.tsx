import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminClubMembersPanel } from "@/components/admin/clubs/admin-club-members-panel"
import { AdminDetailSection } from "@/components/admin/module/admin-detail-section"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminClubDetail } from "@/lib/admin/clubs/clubs-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const detail = await getAdminClubDetail(clubId)

  if (!detail) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={detail.club.name}
        description={detail.club.description ?? "Quản lý câu lạc bộ và thành viên"}
        primaryAction={{ label: "Chỉnh sửa câu lạc bộ", href: `/admin/clubs/${detail.club.id}/edit` }}
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/clubs", variant: "outline" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {detail.detailSections.map((section) => (
            <AdminDetailSection key={section.title} section={section} />
          ))}
          <AdminClubMembersPanel clubId={detail.club.id} members={detail.members} />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm font-semibold">Thao tác nhanh</p>
            <Link href={`/admin/clubs/${detail.club.id}/edit`} className={buttonVariants({ className: "w-full" })}>
              Sửa câu lạc bộ
            </Link>
            <Link href={detail.club.href} className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Mở trang CLB
            </Link>
            <Link href="/admin/clubs" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Danh sách CLB
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
