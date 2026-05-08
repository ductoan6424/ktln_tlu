import { requireAuth, getAuthorizationContext } from "@/lib/auth/authorization"
import { extractShortIdFromSlugId } from "@/lib/communities/urls"
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

  const courseInclude = {
    lecturer: {
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    },
    members: {
      orderBy: { joinedAt: "asc" as const },
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
  }
  const shortId = extractShortIdFromSlugId(courseId)
  const courseById = await prisma.course.findUnique({
    where: { id: courseId },
    include: courseInclude,
  })
  const course =
    courseById ??
    (shortId
      ? await prisma.course.findUnique({
          where: { shortId },
          include: courseInclude,
        })
      : null)

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
