import { requireAuth, getAuthorizationContext } from "@/lib/auth/authorization"
import { extractShortIdFromSlugId } from "@/lib/communities/urls"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"

const courseManagementInclude = {
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
          avatarUrl: true,
          email: true,
          studentId: true,
        },
      },
    },
  },
}

async function findCourseForAccess(courseId: string) {
  const shortId = extractShortIdFromSlugId(courseId)
  const courseById = await prisma.course.findUnique({
    where: { id: courseId },
    include: courseManagementInclude,
  })

  return (
    courseById ??
    (shortId
      ? await prisma.course.findUnique({
          where: { shortId },
          include: courseManagementInclude,
        })
      : null)
  )
}

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

  const course = await findCourseForAccess(courseId)

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

export async function getCourseLearningAccess(courseId: string) {
  const context = await getAuthorizationContext()

  if (!context) {
    await requireAuth()
  }

  if (!context) {
    throw new ForbiddenError("Bạn cần đăng nhập để xem nội dung lớp học")
  }

  const course = await findCourseForAccess(courseId)

  if (!course || course.deletedAt) {
    throw new NotFoundError("Lớp học")
  }

  const isOwner = course.lecturerId === context.profile.userId
  const isSystemAdmin = context.baseRole === "ADMIN"
  const membership = isOwner || isSystemAdmin
    ? null
    : await prisma.courseMember.findUnique({
        where: {
          userId_courseId: {
            userId: context.profile.userId,
            courseId: course.id,
          },
        },
        select: { userId: true, courseId: true },
      })
  const isManager = isOwner || isSystemAdmin
  const isMember = isManager || Boolean(membership)

  return {
    context,
    course,
    isManager,
    isMember,
    canViewLearning: isMember,
    canManageLearning: isManager,
  }
}

export async function requireCourseLearningAccess(courseId: string) {
  const access = await getCourseLearningAccess(courseId)

  if (!access.canViewLearning) {
    throw new ForbiddenError("Bạn không có quyền xem nội dung lớp học này")
  }

  return access
}

export async function requireCourseLearningManagementAccess(courseId: string) {
  const access = await getCourseLearningAccess(courseId)

  if (!access.canManageLearning) {
    throw new ForbiddenError("Bạn không có quyền quản lý nội dung lớp học này")
  }

  return access
}
