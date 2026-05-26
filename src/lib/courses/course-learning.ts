import { requireCourseLearningAccess } from "@/lib/courses/course-permissions"
import { prisma } from "@/lib/prisma/client"

export type CourseAnnouncementDto = {
  id: string
  title: string
  content: string
  type: "GENERAL" | "CLASS_CANCELLED" | "SCHEDULE_CHANGE" | "ASSIGNMENT_REMINDER"
  priority: "NORMAL" | "IMPORTANT"
  isPinned: boolean
  status: "DRAFT" | "PUBLISHED"
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  authorName: string
}

export type AssignmentSubmissionDto = {
  id: string
  studentId: string
  studentCode?: string | null
  studentName?: string | null
  studentEmail?: string | null
  studentAvatarUrl?: string | null
  content: string | null
  attachmentUrls: string[]
  submittedAt: Date
  score: number | null
  feedback: string | null
  gradedAt: Date | null
}

export type CourseAssignmentDto = {
  id: string
  title: string
  description: string
  dueAt: Date
  status: "DRAFT" | "PUBLISHED" | "CLOSED"
  attachmentUrls: string[]
  createdAt: Date
  updatedAt: Date
  submissionCount: number
  viewerSubmission: AssignmentSubmissionDto | null
  submissions: AssignmentSubmissionDto[]
}

function stringArrayFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function scoreToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

type SubmissionRow = {
  id: string
  studentId: string
  content: string | null
  attachmentUrls: unknown
  submittedAt: Date
  score: unknown
  feedback: string | null
  gradedAt: Date | null
  student?: {
    studentId: string | null
    displayName: string
    email: string
    avatarUrl: string | null
  } | null
}

function mapSubmission(row: SubmissionRow): AssignmentSubmissionDto {
  return {
    id: row.id,
    studentId: row.studentId,
    studentCode: row.student?.studentId ?? null,
    studentName: row.student?.displayName ?? null,
    studentEmail: row.student?.email ?? null,
    studentAvatarUrl: row.student?.avatarUrl ?? null,
    content: row.content ?? null,
    attachmentUrls: stringArrayFromJson(row.attachmentUrls),
    submittedAt: row.submittedAt,
    score: scoreToNumber(row.score),
    feedback: row.feedback ?? null,
    gradedAt: row.gradedAt ?? null,
  }
}

export async function listCourseAnnouncements(
  courseId: string,
): Promise<CourseAnnouncementDto[]> {
  const access = await requireCourseLearningAccess(courseId)
  const rows = await prisma.courseAnnouncement.findMany({
    where: {
      courseId: access.course.id,
      deletedAt: null,
      ...(access.isManager ? {} : { publishedAt: { not: null } }),
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { displayName: true } } },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    isPinned: row.isPinned,
    status: row.publishedAt ? "PUBLISHED" : "DRAFT",
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorName: row.author.displayName,
  }))
}

export async function listCourseAssignments(
  courseId: string,
): Promise<CourseAssignmentDto[]> {
  const access = await requireCourseLearningAccess(courseId)
  const rows = await prisma.courseAssignment.findMany({
    where: {
      courseId: access.course.id,
      deletedAt: null,
      ...(access.isManager ? {} : { status: "PUBLISHED" }),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      submissions: access.isManager
        ? {
            include: {
              student: {
                select: {
                  userId: true,
                  displayName: true,
                  avatarUrl: true,
                  email: true,
                  studentId: true,
                },
              },
            },
            orderBy: { submittedAt: "desc" },
          }
        : {
            where: { studentId: access.context.profile.userId },
            take: 1,
          },
      _count: { select: { submissions: true } },
    },
  })

  return rows.map((row) => {
    const submissions = row.submissions.map(mapSubmission)

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dueAt: row.dueAt,
      status: row.status,
      attachmentUrls: stringArrayFromJson(row.attachmentUrls),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      submissionCount: row._count.submissions,
      viewerSubmission: access.isManager ? null : submissions[0] ?? null,
      submissions: access.isManager ? submissions : [],
    }
  })
}
