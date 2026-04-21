import { notFound } from "next/navigation"

import { getAuthorizationContext } from "@/lib/auth/authorization"
import { getCourseDetail } from "@/lib/courses/course-queries"

import { CourseDetailClient } from "./course-detail-client"

export const dynamic = "force-dynamic"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const [course, context] = await Promise.all([
    getCourseDetail(courseId),
    getAuthorizationContext().catch(() => null),
  ])

  if (!course) {
    notFound()
  }

  const canManage = Boolean(
    context &&
      (context.baseRole === "ADMIN" || course.lecturer.userId === context.profile.userId),
  )

  return (
    <CourseDetailClient
      currentUser={
        context
          ? {
              displayName: context.profile.displayName,
              avatarUrl: context.profile.avatarUrl,
            }
          : null
      }
      course={{
        id: course.id,
        name: course.name,
        subject: course.code,
        description: course.description,
        studentCount: course.members.length,
        lecturer: course.lecturer.displayName,
        coverImage:
          course.coverUrl ??
          "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&h=400&fit=crop",
        members: [
          {
            name: course.lecturer.displayName,
            role: "Giảng viên",
          },
          ...course.members.map((member) => ({
            name: member.user.displayName,
            role: member.user.studentId ? `Sinh viên • ${member.user.studentId}` : "Sinh viên",
          })),
        ],
      }}
      canManage={canManage}
    />
  )
}
