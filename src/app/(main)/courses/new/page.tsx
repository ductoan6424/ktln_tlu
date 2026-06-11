import { requireCourseCreator } from "@/lib/courses/course-permissions"
import { prisma } from "@/lib/prisma/client"

import { NewCourseForm } from "./new-course-form"

export const metadata = {
  title: "Tạo lớp học",
  description: "Mở lớp học mới và mời giảng viên, sinh viên tham gia.",
}

export const dynamic = "force-dynamic"

export default async function NewCoursePage() {
  const context = await requireCourseCreator()
  const lecturers =
    context.baseRole === "ADMIN"
      ? await prisma.userProfile.findMany({
          where: { role: "LECTURER", deletedAt: null },
          select: { userId: true, displayName: true, email: true },
          orderBy: { displayName: "asc" },
        })
      : []

  return (
    <NewCourseForm
      requireLecturerSelection={context.baseRole === "ADMIN"}
      lecturers={lecturers}
    />
  )
}
