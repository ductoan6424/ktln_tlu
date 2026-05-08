import { redirect } from "next/navigation"

import { buildCommunityPath } from "@/lib/communities/urls"
import { requireCourseManagementAccess } from "@/lib/courses/course-permissions"

import { CourseManageTabs } from "./course-manage-tabs"

export const dynamic = "force-dynamic"

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const { course } = await requireCourseManagementAccess(courseId)
  const canonicalPath = buildCommunityPath("COURSE", course.code, course.shortId, "manage")

  if (canonicalPath !== `/courses/${courseId}/manage`) {
    redirect(canonicalPath)
  }

  return (
    <CourseManageTabs
      course={{
        id: course.id,
        name: course.name,
        code: course.code,
        description: course.description,
        members: course.members.map((member) => ({
          user: {
            userId: member.user.userId,
            displayName: member.user.displayName,
            studentId: member.user.studentId,
          },
        })),
      }}
    />
  )
}
