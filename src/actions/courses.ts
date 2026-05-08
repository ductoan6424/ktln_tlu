"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { buildCommunityPath } from "@/lib/communities/urls"
import { requireCourseCreator, requireCourseManagementAccess } from "@/lib/courses/course-permissions"
import { notifyCourseStudentAdded } from "@/lib/notifications/dispatchers"
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

const addStudentsByCodesSchema = z.object({
  courseId: z.string().min(1, "Thiếu lớp học cần cập nhật"),
  studentCodesText: z.string().min(1, "Danh sách mã sinh viên là bắt buộc"),
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
    const management = await requireCourseManagementAccess(input.courseId)
    const courseId = management.course.id

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
          courseId,
        },
      },
    })

    if (existingMember) {
      return errorResult("Sinh viên này đã có trong lớp học", "CONFLICT")
    }

    await prisma.courseMember.create({
      data: {
        courseId,
        userId: student.userId,
      },
    })

    await notifyCourseStudentAdded({
      recipientId: student.userId,
      actor: {
        userId: management.context.profile.userId,
        displayName: management.context.profile.displayName,
        avatarUrl: management.context.profile.avatarUrl,
      },
      targetType: "COURSE",
      targetId: courseId,
      targetName: management.course.name,
      link: buildCommunityPath(
        "COURSE",
        management.course.code,
        management.course.shortId,
      ),
    }).catch((error) => {
      console.error("notifyCourseStudentAdded error:", error)
    })

    revalidatePath(`/courses/${input.courseId}`)
    revalidatePath(`/courses/${input.courseId}/manage`)
    const courseHref = buildCommunityPath("COURSE", management.course.code, management.course.shortId)
    revalidatePath(courseHref)
    revalidatePath(`${courseHref}/manage`)

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

function parseStudentCodes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/g)
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

export async function addStudentsToCourseByCodes(
  rawInput: unknown,
): Promise<ActionResult<{
  added: string[]
  alreadyMember: string[]
  notFound: string[]
}>> {
  try {
    const input = addStudentsByCodesSchema.parse(normalizeFormInput(rawInput))
    const management = await requireCourseManagementAccess(input.courseId)
    const courseId = management.course.id

    const codes = parseStudentCodes(input.studentCodesText)
    if (codes.length === 0) {
      return errorResult("Danh sách mã sinh viên không hợp lệ", "VALIDATION_ERROR")
    }

    const students = await prisma.userProfile.findMany({
      where: {
        studentId: { in: codes },
        role: "STUDENT",
        deletedAt: null,
      },
      select: {
        userId: true,
        studentId: true,
        role: true,
      },
    })

    const validStudents = students.filter(
      (student): student is typeof student & { studentId: string } =>
        Boolean(student.studentId),
    )
    const foundCodes = new Set(validStudents.map((student) => student.studentId))
    const existingMembers = await prisma.courseMember.findMany({
      where: {
        courseId,
        userId: { in: validStudents.map((student) => student.userId) },
      },
      select: { userId: true },
    })
    const existingUserIds = new Set(existingMembers.map((member) => member.userId))
    const newStudents = validStudents.filter(
      (student) => !existingUserIds.has(student.userId),
    )

    if (newStudents.length > 0) {
      await prisma.courseMember.createMany({
        data: newStudents.map((student) => ({
          courseId,
          userId: student.userId,
        })),
        skipDuplicates: true,
      })
      await Promise.allSettled(
        newStudents.map((student) =>
          notifyCourseStudentAdded({
            recipientId: student.userId,
            actor: {
              userId: management.context.profile.userId,
              displayName: management.context.profile.displayName,
              avatarUrl: management.context.profile.avatarUrl,
            },
            targetType: "COURSE",
            targetId: courseId,
            targetName: management.course.name,
            link: buildCommunityPath(
              "COURSE",
              management.course.code,
              management.course.shortId,
            ),
          }),
        ),
      )
    }

    const added = newStudents.map((student) => student.studentId)
    const alreadyMember = validStudents
      .filter((student) => existingUserIds.has(student.userId))
      .map((student) => student.studentId)
    const notFound = codes.filter((code) => !foundCodes.has(code))

    revalidatePath(`/courses/${input.courseId}`)
    revalidatePath(`/courses/${input.courseId}/manage`)
    const courseHref = buildCommunityPath("COURSE", management.course.code, management.course.shortId)
    revalidatePath(courseHref)
    revalidatePath(`${courseHref}/manage`)

    return successResult({ added, alreadyMember, notFound })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Dữ liệu không hợp lệ", "VALIDATION_ERROR")
    }

    return errorResult(
      error instanceof Error ? error.message : "Không thể thêm danh sách sinh viên vào lớp",
      "UPDATE_FAILED",
    )
  }
}
