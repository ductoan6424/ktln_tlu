"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { buildCommunityPath } from "@/lib/communities/urls"
import {
  requireCourseLearningAccess,
  requireCourseLearningManagementAccess,
} from "@/lib/courses/course-permissions"
import { UploadValidationError, uploadCommunityAttachment } from "@/lib/cloudinary/upload"
import {
  notifyAssignmentSubmissionGraded,
  notifyCourseAnnouncementPublished,
  notifyCourseAssignmentPublished,
} from "@/lib/notifications/dispatchers"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"

const announcementTypeSchema = z.enum([
  "GENERAL",
  "CLASS_CANCELLED",
  "SCHEDULE_CHANGE",
  "ASSIGNMENT_REMINDER",
])
const announcementPrioritySchema = z.enum(["NORMAL", "IMPORTANT"])
const assignmentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CLOSED"])

const booleanFormValueSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "on"
  return value
}, z.boolean())

const stringArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}, z.array(z.string().url()).default([]))

const createAnnouncementSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(1).max(5000),
  type: announcementTypeSchema.default("GENERAL"),
  priority: announcementPrioritySchema.default("NORMAL"),
  isPinned: booleanFormValueSchema.default(false),
  publish: booleanFormValueSchema.default(false),
})

const createAssignmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(10000),
  dueAt: z.coerce.date(),
  status: assignmentStatusSchema.default("DRAFT"),
  attachmentUrls: stringArraySchema,
})

const submitAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  content: z.string().trim().max(10000).optional(),
  attachmentUrls: stringArraySchema,
})

const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0).max(10),
  feedback: z.string().trim().max(5000).optional(),
})

function normalizeFormInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries())
  }

  return rawInput
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0
}

async function attachmentUrlsFromInput(rawInput: unknown) {
  if (!(rawInput instanceof FormData)) return null
  const files = rawInput.getAll("attachments").filter(isUploadFile)
  if (files.length === 0) return null
  const uploaded = await Promise.all(files.map((file) => uploadCommunityAttachment(file)))
  return uploaded.map((file) => file.url)
}

function courseHref(course: { code: string; shortId: string }, suffix?: string) {
  const href = buildCommunityPath("COURSE", course.code, course.shortId)
  return suffix ? `${href}?tab=${suffix}` : href
}

function courseActor(access: {
  context: {
    profile: { userId: string; displayName: string; avatarUrl: string | null }
  }
}) {
  return {
    userId: access.context.profile.userId,
    displayName: access.context.profile.displayName,
    avatarUrl: access.context.profile.avatarUrl,
  }
}

function courseStudentRecipientIds(access: {
  context: { profile: { userId: string } }
  course: { members?: Array<{ user: { userId: string } }> }
}) {
  return Array.from(
    new Set(
      (access.course.members ?? [])
        .map((member) => member.user.userId)
        .filter((userId) => userId !== access.context.profile.userId),
    ),
  )
}

export async function createCourseAnnouncement(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; status: "DRAFT" | "PUBLISHED" }>> {
  try {
    const uploadedUrls = await attachmentUrlsFromInput(rawInput)
    const input = createAnnouncementSchema.parse(normalizeFormInput(rawInput))
    const access = await requireCourseLearningManagementAccess(input.courseId)
    const publishedAt = input.publish ? new Date() : null
    const created = await prisma.courseAnnouncement.create({
      data: {
        courseId: access.course.id,
        authorId: access.context.profile.userId,
        title: input.title,
        content: uploadedUrls?.length
          ? `${input.content}\n\n${uploadedUrls.join("\n")}`
          : input.content,
        type: input.type,
        priority: input.priority,
        isPinned: input.isPinned,
        publishedAt,
      },
      select: { id: true, publishedAt: true },
    })
    const href = courseHref(access.course, "announcements")

    if (created.publishedAt) {
      await Promise.allSettled(
        courseStudentRecipientIds(access).map((recipientId) =>
          notifyCourseAnnouncementPublished({
            recipientId,
            actor: courseActor(access),
            targetType: "COURSE",
            targetId: access.course.id,
            targetName: access.course.name,
            announcementId: created.id,
            announcementTitle: input.title,
            link: href,
          }),
        ),
      )
    }

    revalidatePath(href)
    return successResult({
      id: created.id,
      status: created.publishedAt ? "PUBLISHED" : "DRAFT",
    })
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
    }
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Invalid data", "VALIDATION_ERROR")
    }
    return errorResult("Cannot create course announcement", "CREATE_FAILED")
  }
}

export async function createCourseAssignment(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; status: "DRAFT" | "PUBLISHED" | "CLOSED" }>> {
  try {
    const uploadedUrls = await attachmentUrlsFromInput(rawInput)
    const normalized = normalizeFormInput(rawInput) as Record<string, unknown>
    const input = createAssignmentSchema.parse({
      ...normalized,
      attachmentUrls: uploadedUrls ?? normalized?.attachmentUrls,
    })
    if (input.dueAt.getTime() <= Date.now()) {
      return errorResult("Assignment deadline must be in the future", "DEADLINE_IN_PAST")
    }
    const access = await requireCourseLearningManagementAccess(input.courseId)
    const created = await prisma.courseAssignment.create({
      data: {
        courseId: access.course.id,
        createdBy: access.context.profile.userId,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
        status: input.status,
        attachmentUrls: input.attachmentUrls,
      },
      select: { id: true, status: true },
    })
    const href = courseHref(access.course, "assignments")

    if (created.status === "PUBLISHED") {
      await Promise.allSettled(
        courseStudentRecipientIds(access).map((recipientId) =>
          notifyCourseAssignmentPublished({
            recipientId,
            actor: courseActor(access),
            targetType: "COURSE",
            targetId: access.course.id,
            targetName: access.course.name,
            assignmentId: created.id,
            assignmentTitle: input.title,
            link: href,
          }),
        ),
      )
    }

    revalidatePath(href)
    return successResult({ id: created.id, status: created.status })
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
    }
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Invalid data", "VALIDATION_ERROR")
    }
    return errorResult("Cannot create course assignment", "CREATE_FAILED")
  }
}

export async function submitAssignment(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const uploadedUrls = await attachmentUrlsFromInput(rawInput)
    const normalized = normalizeFormInput(rawInput) as Record<string, unknown>
    const input = submitAssignmentSchema.parse({
      ...normalized,
      attachmentUrls: uploadedUrls ?? normalized?.attachmentUrls,
    })
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: input.assignmentId },
      select: {
        id: true,
        courseId: true,
        title: true,
        status: true,
        dueAt: true,
        deletedAt: true,
      },
    })

    if (!assignment || assignment.deletedAt) {
      return errorResult("Assignment not found", "NOT_FOUND")
    }
    if (assignment.status !== "PUBLISHED") {
      return errorResult("Assignment is not open for submissions", "NOT_PUBLISHED")
    }
    if (assignment.dueAt.getTime() < Date.now()) {
      return errorResult("Assignment deadline has passed", "DEADLINE_PASSED")
    }

    const access = await requireCourseLearningAccess(assignment.courseId)
    const submitted = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: access.context.profile.userId,
        },
      },
      update: {
        content: input.content?.trim() || null,
        attachmentUrls: input.attachmentUrls,
        submittedAt: new Date(),
        score: null,
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      },
      create: {
        assignmentId: assignment.id,
        studentId: access.context.profile.userId,
        content: input.content?.trim() || null,
        attachmentUrls: input.attachmentUrls,
      },
      select: { id: true },
    })

    revalidatePath(courseHref(access.course, "assignments"))
    return successResult({ id: submitted.id })
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return errorResult(error.message, "UPLOAD_VALIDATION_ERROR")
    }
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Invalid data", "VALIDATION_ERROR")
    }
    return errorResult("Cannot submit assignment", "SUBMIT_FAILED")
  }
}

export async function gradeAssignmentSubmission(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input = gradeSubmissionSchema.parse(normalizeFormInput(rawInput))
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        assignment: {
          select: {
            courseId: true,
            title: true,
          },
        },
      },
    })

    if (!submission) {
      return errorResult("Submission not found", "NOT_FOUND")
    }

    const access = await requireCourseLearningManagementAccess(submission.assignment.courseId)
    const graded = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: input.score,
        feedback: input.feedback?.trim() || null,
        gradedAt: new Date(),
        gradedBy: access.context.profile.userId,
      },
      select: { id: true, studentId: true, score: true, feedback: true },
    })
    const href = courseHref(access.course, "assignments")

    await notifyAssignmentSubmissionGraded({
      recipientId: graded.studentId,
      actor: courseActor(access),
      targetType: "COURSE",
      targetId: access.course.id,
      targetName: access.course.name,
      assignmentId: submission.assignmentId,
      assignmentTitle: submission.assignment.title,
      submissionId: submission.id,
      link: href,
    }).catch((error) => {
      console.error("notifyAssignmentSubmissionGraded error:", error)
    })

    revalidatePath(href)
    return successResult({ id: graded.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(error.issues[0]?.message ?? "Invalid data", "VALIDATION_ERROR")
    }
    return errorResult("Cannot grade assignment submission", "GRADE_FAILED")
  }
}
