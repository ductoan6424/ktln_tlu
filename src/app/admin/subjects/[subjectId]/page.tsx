import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminCourseMembersPanel } from "@/components/admin/courses/admin-course-members-panel"
import { AdminDetailSection } from "@/components/admin/module/admin-detail-section"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminCourseDetail } from "@/lib/admin/courses/courses-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminSubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const { subjectId } = await params
  const detail = await getAdminCourseDetail(subjectId)

  if (!detail) notFound()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={detail.course.name}
        description={detail.course.description ?? detail.course.code}
        primaryAction={{ label: "Chỉnh sửa lớp học", href: `/admin/subjects/${detail.course.id}/edit` }}
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/subjects", variant: "outline" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {detail.detailSections.map((section) => (
            <AdminDetailSection key={section.title} section={section} />
          ))}
          <AdminCourseMembersPanel courseId={detail.course.id} members={detail.members} />
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-semibold">Thao tác nhanh</p>
            <Link href={`/admin/subjects/${detail.course.id}/edit`} className={buttonVariants({ className: "w-full" })}>
              Sửa lớp học
            </Link>
            <Link href={detail.course.href} className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Mở trang lớp
            </Link>
            <Link href="/admin/subjects" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Danh sách lớp học
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
