import { requireAuth, getAuthorizationContext } from "@/lib/auth/authorization"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"

export async function requireCourseCreator() {
  const context = await getAuthorizationContext()

  if (!context) {
    await requireAuth()
  }

  if (!context || (context.baseRole !== "LECTURER" && context.baseRole !== "ADMIN")) {
    throw new ForbiddenError("Chỉ giảng viên hoặc quản trị viên mới có thể tạo lớp học")
  }

  return context
}

export async function requireCourseManagementAccess(courseId: string) {
  const context = await getAuthorizationContext()

  if (!context) {
    await requireAuth()
  }

  if (!context) {
    throw new ForbiddenError("Bạn không có quyền quản lý lớp học này")
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lecturer: {
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              userId: true,
              displayName: true,
              studentId: true,
            },
          },
        },
      },
    },
  })

  if (!course || course.deletedAt) {
    throw new NotFoundError("Lớp học")
  }

  const isOwner = course.lecturerId === context.profile.userId
  const isSystemAdmin = context.baseRole === "ADMIN"

  if (!isOwner && !isSystemAdmin) {
    throw new ForbiddenError("Bạn không có quyền quản lý lớp học này")
  }

  return { context, course }
}
