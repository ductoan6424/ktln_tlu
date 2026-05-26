import Link from "next/link"

import { gradeAssignmentSubmission } from "@/actions/course-learning"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { CourseAssignmentDto } from "@/lib/courses/course-learning"

import { CourseAssignmentSubmitForm } from "../../course-assignment-submit-form"

type CourseAssignmentDetailPanelProps = {
  courseHref: string
  canManage: boolean
  memberCount: number
  assignment: CourseAssignmentDto
}

function formatDueAt(value: Date) {
  return value.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function scoreLabel(score: number | null) {
  return score === null ? "Chưa chấm" : `${score}/10`
}

function assignmentStatusLabel(status: CourseAssignmentDto["status"]) {
  if (status === "DRAFT") return "Nháp"
  if (status === "CLOSED") return "Đã đóng"
  return "Đã đăng"
}

function submissionProgress(assignment: CourseAssignmentDto, memberCount: number) {
  return memberCount > 0
    ? `${assignment.submissionCount}/${memberCount} sinh viên đã nộp`
    : `${assignment.submissionCount} bài nộp`
}

async function gradeSubmissionFormAction(formData: FormData) {
  "use server"
  await gradeAssignmentSubmission(formData)
}

export function CourseAssignmentDetailPanel({
  courseHref,
  canManage,
  memberCount,
  assignment,
}: CourseAssignmentDetailPanelProps) {
  const viewerSubmission = assignment.viewerSubmission

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 lg:px-0">
      <Link
        href={`${courseHref}?tab=assignments`}
        className="inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        Quay lại bài tập
      </Link>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={assignment.status === "PUBLISHED" ? "default" : "secondary"}>
              {assignmentStatusLabel(assignment.status)}
            </Badge>
            <span>Hạn nộp {formatDueAt(assignment.dueAt)}</span>
            <span>{submissionProgress(assignment, memberCount)}</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{assignment.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {assignment.description}
            </p>
          </div>

          {assignment.attachmentUrls.length > 0 ? (
            <div className="space-y-1 text-sm">
              {assignment.attachmentUrls.map((url) => (
                <a key={url} href={url} className="block text-primary hover:underline">
                  {url}
                </a>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canManage ? (
        <details open className="rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
          <summary className="cursor-pointer list-none px-4 py-4 text-base font-medium [&::-webkit-details-marker]:hidden">
            Bài nộp của sinh viên ({submissionProgress(assignment, memberCount)})
          </summary>
          <div className="px-4 pb-4">
              {assignment.submissions.length > 0 ? (
                <div className="space-y-3">
                  {assignment.submissions.map((submission) => (
                    <div key={submission.id} className="rounded-md border bg-card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {submission.studentName ?? submission.studentId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {submission.studentCode ?? submission.studentEmail ?? submission.studentId}
                          </p>
                        </div>
                        <Badge variant={submission.score === null ? "outline" : "secondary"}>
                          {scoreLabel(submission.score)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Đã nộp: {formatDueAt(submission.submittedAt)}
                      </p>
                      {submission.content ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm">{submission.content}</p>
                      ) : null}
                      {submission.attachmentUrls.length > 0 ? (
                        <div className="mt-2 space-y-1 text-sm">
                          {submission.attachmentUrls.map((url) => (
                            <a key={url} href={url} className="block text-primary hover:underline">
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <form action={gradeSubmissionFormAction} className="mt-3 grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_auto]">
                        <input type="hidden" name="submissionId" value={submission.id} />
                        <Input name="score" type="number" min="0" max="10" step="0.1" defaultValue={submission.score ?? ""} placeholder="Điểm" />
                        <Input name="feedback" defaultValue={submission.feedback ?? ""} placeholder="Nhận xét" />
                        <Button type="submit" size="sm">Chấm</Button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có bài nộp.</p>
              )}
          </div>
        </details>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nộp bài</CardTitle>
          </CardHeader>
          <CardContent>
            {viewerSubmission ? (
              <div className="mb-3 text-sm text-muted-foreground">
                <p>Đã nộp: {formatDueAt(viewerSubmission.submittedAt)}</p>
                <p>Điểm: {scoreLabel(viewerSubmission.score)}</p>
                {viewerSubmission.feedback ? (
                  <p>Nhận xét: {viewerSubmission.feedback}</p>
                ) : null}
              </div>
            ) : null}
            <CourseAssignmentSubmitForm assignmentId={assignment.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
