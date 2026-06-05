import { notFound } from "next/navigation"

import { AdminCourseForm } from "@/components/admin/courses/admin-course-form"
import {
  getAdminCourseDetail,
  listCourseLecturerOptions,
} from "@/lib/admin/courses/courses-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminEditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const { subjectId } = await params
  const [detail, lecturers] = await Promise.all([
    getAdminCourseDetail(subjectId),
    listCourseLecturerOptions(),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <AdminCourseForm
      lecturers={lecturers}
      initialValues={{
        id: detail.course.id,
        name: detail.course.name,
        code: detail.course.code,
        description: detail.course.description,
        lecturerId: detail.course.lecturerId,
        requirePostApproval: detail.course.requirePostApproval,
        chatEnabled: detail.course.chatEnabled,
        chatMode: detail.course.chatMode,
      }}
    />
  )
}
