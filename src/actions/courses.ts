"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireCourseCreator, requireCourseManagementAccess } from "@/lib/courses/course-permissions"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const createCourseSchema = z.object({
  name: z.string().min(2, "Tên lớp học phải có ít nhất 2 ký tự"),
  code: z.string().min(2, "Mã môn học là bắt buộc"),
  description: z.string().optional(),
})

const addStudentSchema = z.object({
  courseId: z.string().min(1, "Thiếu lớp học cần cập nhật"),
  studentId: z.string().min(1, "Mã sinh viên là bắt buộc"),
})

function slugifyCourseCode(code: string) {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

export async function createCourse(rawInput: unknown): Promise<ActionResult<{ courseId: string }>> {
  try {
    const context = await requireCourseCreator()
    const input = createCourseSchema.parse(normalizeFormInput(rawInput))

    const course = await prisma.course.create({
      data: {
        name: input.name,
        code: input.code.toUpperCase(),
        slug: slugifyCourseCode(input.code),
        description: input.description?.trim() || null,
        coverUrl: null,
        lecturerId: context.profile.userId,
      },
    })

    revalidatePath("/courses")
    revalidatePath(`/courses/${course.id}`)
    redirect(`/courses/${course.id}/manage`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult(
      error instanceof Error ? error.message : "Không thể tạo lớp học",
      "CREATE_FAILED",
    )
  }
}

export async function addStudentToCourse(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const input = addStudentSchema.parse(normalizeFormInput(rawInput))
    await requireCourseManagementAccess(input.courseId)

    const student = await prisma.userProfile.findUnique({
      where: { studentId: input.studentId },
      select: {
        userId: true,
        role: true,
      },
    })

    if (!student || student.role !== "STUDENT") {
      return errorResult("Không tìm thấy sinh viên với mã đã nhập", "NOT_FOUND")
    }

    const existingMember = await prisma.courseMember.findUnique({
      where: {
        userId_courseId: {
          userId: student.userId,
          courseId: input.courseId,
        },
      },
    })

    if (existingMember) {
      return errorResult("Sinh viên này đã có trong lớp học", "CONFLICT")
    }

    await prisma.courseMember.create({
      data: {
        courseId: input.courseId,
        userId: student.userId,
      },
    })

    revalidatePath(`/courses/${input.courseId}`)
    revalidatePath(`/courses/${input.courseId}/manage`)

    return successResult({ userId: student.userId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult(
      error instanceof Error ? error.message : "Không thể thêm sinh viên vào lớp",
      "UPDATE_FAILED",
    )
  }
}
