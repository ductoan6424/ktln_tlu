import { createCourseAssignment, gradeAssignmentSubmission, submitAssignment } from "@/actions/course-learning"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CourseAssignmentDto } from "@/lib/courses/course-learning"

type CourseAssignmentsPanelProps = {
  courseId: string
  canManage: boolean
  assignments: CourseAssignmentDto[]
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

async function createAssignmentFormAction(formData: FormData) {
  "use server"
  await createCourseAssignment(formData)
}

async function submitAssignmentFormAction(formData: FormData) {
  "use server"
  await submitAssignment(formData)
}

async function gradeSubmissionFormAction(formData: FormData) {
  "use server"
  await gradeAssignmentSubmission(formData)
}

export function CourseAssignmentsPanel({
  courseId,
  canManage,
  assignments,
}: CourseAssignmentsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-4">
        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Chưa có bài tập nào.
          </div>
        ) : (
          assignments.map((assignment) => {
            const viewerSubmission = assignment.viewerSubmission

            return (
              <article key={assignment.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{assignment.status}</span>
                  <span>Hạn nộp {formatDueAt(assignment.dueAt)}</span>
                  <span>{assignment.submissionCount} bài nộp</span>
                </div>
                <h2 className="mt-2 text-base font-semibold">{assignment.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {assignment.description}
                </p>

                {assignment.attachmentUrls.length > 0 ? (
                  <div className="mt-3 space-y-1 text-sm">
                    {assignment.attachmentUrls.map((url) => (
                      <a key={url} href={url} className="block text-primary hover:underline">
                        {url}
                      </a>
                    ))}
                  </div>
                ) : null}

                {!canManage ? (
                  <div className="mt-4 rounded-md border bg-muted/30 p-3">
                    <p className="text-sm font-medium">Nộp bài</p>
                    {viewerSubmission ? (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>Đã nộp: {formatDueAt(viewerSubmission.submittedAt)}</p>
                        <p>Điểm: {scoreLabel(viewerSubmission.score)}</p>
                        {viewerSubmission.feedback ? (
                          <p>Nhận xét: {viewerSubmission.feedback}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <form action={submitAssignmentFormAction} className="mt-3 space-y-2" encType="multipart/form-data">
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <Textarea name="content" placeholder="Ghi chú bài nộp" rows={3} />
                      <Input name="attachments" type="file" multiple />
                      <Button type="submit" size="sm">Nộp bài</Button>
                    </form>
                  </div>
                ) : null}

                {canManage && assignment.submissions.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold">Bài nộp</p>
                    {assignment.submissions.map((submission) => (
                      <div key={submission.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">
                          {submission.studentName ?? submission.studentId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scoreLabel(submission.score)}
                        </p>
                        {submission.content ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm">{submission.content}</p>
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
                ) : null}
              </article>
            )
          })
        )}
      </section>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tạo bài tập</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAssignmentFormAction} className="space-y-3" encType="multipart/form-data">
              <input type="hidden" name="courseId" value={courseId} />
              <Input name="title" placeholder="Tiêu đề" required />
              <Textarea name="description" placeholder="Mô tả" rows={5} required />
              <Input name="dueAt" type="datetime-local" required />
              <Input name="attachments" type="file" multiple />
              <select name="status" defaultValue="PUBLISHED" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="DRAFT">Lưu nháp</option>
                <option value="PUBLISHED">Đăng bài tập</option>
                <option value="CLOSED">Đóng</option>
              </select>
              <Button type="submit" className="w-full">Tạo bài tập</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
