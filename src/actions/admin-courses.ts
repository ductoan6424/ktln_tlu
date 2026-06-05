"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/auth/authorization"
import { buildCommunityPath } from "@/lib/communities/urls"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult, type ActionResult } from "@/types/api"

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const chatModeSchema = z.enum(["OPEN", "ADMINS_ONLY", "READ_ONLY"])

const adminCourseInputSchema = z.object({
  name: z.string().trim().min(2, "Tên lớp học phải có ít nhất 2 ký tự"),
  code: z.string().trim().min(2, "Mã lớp học là bắt buộc"),
  description: z.string().optional(),
  lecturerId: z.string().trim().min(1, "Vui lòng chọn giảng viên phụ trách"),
  requirePostApproval: booleanFormValueSchema.default(false),
  chatEnabled: booleanFormValueSchema.default(true),
  chatMode: chatModeSchema.default("OPEN"),
})

const updateAdminCourseInputSchema = adminCourseInputSchema.extend({
  courseId: z.string().trim().min(1),
})

const courseIdSchema = z.string().trim().min(1)

const addCourseMemberSchema = z.object({
  courseId: z.string().trim().min(1),
  studentId: z.string().trim().min(1, "Nhập mã sinh viên hoặc email sinh viên"),
})

const removeCourseMemberSchema = z.object({
  courseId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

function normalizeInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

function slugifyCourseCode(code: string) {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toCourseData(input: z.infer<typeof adminCourseInputSchema>) {
  const code = input.code.trim().toUpperCase()

  return {
    name: input.name.trim(),
    code,
    slug: slugifyCourseCode(code),
    description: input.description?.trim() || null,
    lecturerId: input.lecturerId,
    requirePostApproval: input.requirePostApproval,
    chatEnabled: input.chatEnabled,
    chatMode: input.chatEnabled ? input.chatMode : "READ_ONLY",
  }
}

async function validateLecturer(lecturerId: string) {
  const lecturer = await prisma.userProfile.findUnique({
    where: { userId: lecturerId },
    select: {
      userId: true,
      role: true,
      deletedAt: true,
    },
  })

  if (!lecturer || lecturer.deletedAt || lecturer.role !== "LECTURER") {
    return false
  }

  return true
}

function revalidateCourseSurfaces(course?: { id: string; code: string; shortId: string }) {
  revalidatePath("/admin/subjects")
  revalidatePath("/courses")
  revalidatePath("/feed")

  if (!course) return

  revalidatePath(`/admin/subjects/${course.id}`)
  revalidatePath(`/admin/subjects/${course.id}/edit`)
  const href = buildCommunityPath("COURSE", course.code, course.shortId)
  revalidatePath(href)
  revalidatePath(`${href}/manage`)
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult(error.issues[0]?.message ?? "Dữ liệu lớp học không hợp lệ", "VALIDATION_ERROR")
}

export async function createAdminCourse(
  rawInput: unknown,
): Promise<ActionResult<{ courseId: string }>> {
  try {
    await requireAdminPermission("admin.subjects.manage")
    const parsed = adminCourseInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    if (!(await validateLecturer(parsed.data.lecturerId))) {
      return errorResult("Giảng viên phụ trách không hợp lệ", "VALIDATION_ERROR")
    }

    const course = await prisma.course.create({
      data: toCourseData(parsed.data),
      select: { id: true, code: true, shortId: true },
    })

    revalidateCourseSurfaces(course)
    return successResult({ courseId: course.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể tạo lớp học", "CREATE_FAILED")
  }
}

export async function updateAdminCourse(
  rawInput: unknown,
): Promise<ActionResult<{ courseId: string }>> {
  try {
    await requireAdminPermission("admin.subjects.manage")
    const parsed = updateAdminCourseInputSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    if (!(await validateLecturer(parsed.data.lecturerId))) {
      return errorResult("Giảng viên phụ trách không hợp lệ", "VALIDATION_ERROR")
    }

    const existing = await prisma.course.findUnique({
      where: { id: parsed.data.courseId },
      select: { id: true, deletedAt: true },
    })
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy lớp học", "NOT_FOUND")
    }

    const course = await prisma.course.update({
      where: { id: parsed.data.courseId },
      data: toCourseData(parsed.data),
      select: { id: true, code: true, shortId: true },
    })

    revalidateCourseSurfaces(course)
    return successResult({ courseId: course.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật lớp học", "UPDATE_FAILED")
  }
}

export async function deleteAdminCourse(
  courseId: string,
): Promise<ActionResult<{ courseId: string }>> {
  try {
    await requireAdminPermission("admin.subjects.manage")
    const id = courseIdSchema.parse(courseId)
    const existing = await prisma.course.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    })
    if (!existing || existing.deletedAt) {
      return errorResult("Không tìm thấy lớp học", "NOT_FOUND")
    }

    const course = await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, code: true, shortId: true },
    })

    revalidateCourseSurfaces(course)
    return successResult({ courseId: course.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã lớp học không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể xóa lớp học", "DELETE_FAILED")
  }
}

export async function addAdminCourseMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.subjects.manage")
    const parsed = addCourseMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const course = await prisma.course.findUnique({
      where: { id: parsed.data.courseId },
      select: { id: true, code: true, shortId: true, deletedAt: true },
    })
    if (!course || course.deletedAt) {
      return errorResult("Không tìm thấy lớp học", "NOT_FOUND")
    }

    const identifier = parsed.data.studentId.trim()
    const student = await prisma.userProfile.findFirst({
      where: {
        role: "STUDENT",
        deletedAt: null,
        OR: [
          { studentId: identifier.toUpperCase() },
          { email: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
      select: {
        userId: true,
        role: true,
        deletedAt: true,
      },
    })
    if (!student || student.deletedAt || student.role !== "STUDENT") {
      return errorResult("Không tìm thấy sinh viên", "NOT_FOUND")
    }

    const existing = await prisma.courseMember.findUnique({
      where: { userId_courseId: { userId: student.userId, courseId: course.id } },
      select: { userId: true },
    })
    if (existing) {
      return errorResult("Sinh viên đã có trong lớp", "CONFLICT")
    }

    await prisma.courseMember.create({
      data: { courseId: course.id, userId: student.userId },
    })

    revalidateCourseSurfaces(course)
    return successResult({ userId: student.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể thêm sinh viên vào lớp", "UPDATE_FAILED")
  }
}

export async function removeAdminCourseMember(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminPermission("admin.subjects.manage")
    const parsed = removeCourseMemberSchema.safeParse(normalizeInput(rawInput))
    if (!parsed.success) return validationError(parsed.error)

    const course = await prisma.course.findUnique({
      where: { id: parsed.data.courseId },
      select: { id: true, code: true, shortId: true, deletedAt: true },
    })
    if (!course || course.deletedAt) {
      return errorResult("Không tìm thấy lớp học", "NOT_FOUND")
    }

    await prisma.courseMember.delete({
      where: {
        userId_courseId: {
          userId: parsed.data.userId,
          courseId: course.id,
        },
      },
    })

    revalidateCourseSurfaces(course)
    return successResult({ userId: parsed.data.userId })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể xóa sinh viên khỏi lớp", "UPDATE_FAILED")
  }
}
