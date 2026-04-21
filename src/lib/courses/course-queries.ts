import { prisma } from "@/lib/prisma/client"

export async function listCourses() {
  return prisma.course.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      lecturer: {
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })
}

export async function getCourseDetail(courseId: string) {
  return prisma.course.findUnique({
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
              avatarUrl: true,
              studentId: true,
            },
          },
        },
      },
    },
  })
}
