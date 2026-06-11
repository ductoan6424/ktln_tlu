import { notFound, redirect } from "next/navigation"

import { buildCommunityPath } from "@/lib/communities/urls"
import { getCourseAssignmentDetail } from "@/lib/courses/course-learning"

import { CourseAssignmentDetailPanel } from "./course-assignment-detail-panel"

export const metadata = {
  title: "Chi tiết bài tập",
  description: "Xem yêu cầu, hạn nộp và tài liệu của bài tập trong lớp học.",
}

export const dynamic = "force-dynamic"

export default async function CourseAssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const detail = await getCourseAssignmentDetail(courseId, assignmentId)

  if (!detail) {
    notFound()
  }

  const courseHref = buildCommunityPath("COURSE", detail.course.code, detail.course.shortId)
  const canonicalHref = `${courseHref}/assignments/${assignmentId}`

  if (`/courses/${courseId}/assignments/${assignmentId}` !== canonicalHref) {
    redirect(canonicalHref)
  }

  return (
    <CourseAssignmentDetailPanel
      courseHref={courseHref}
      canManage={detail.isManager}
      memberCount={detail.course.memberCount}
      assignment={detail.assignment}
    />
  )
}
