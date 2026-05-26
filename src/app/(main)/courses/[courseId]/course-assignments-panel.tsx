import Link from "next/link"

import { createCourseAssignment } from "@/actions/course-learning"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CourseAssignmentDto } from "@/lib/courses/course-learning"

type CourseAssignmentsPanelProps = {
  courseId: string
  courseHref: string
  canManage: boolean
  memberCount: number
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

function datetimeLocalMinValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

async function createAssignmentFormAction(formData: FormData) {
  "use server"
  await createCourseAssignment(formData)
}

export function CourseAssignmentsPanel({
  courseId,
  courseHref,
  canManage,
  memberCount,
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
          assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`${courseHref}/assignments/${assignment.id}`}
              data-assignment-card={assignment.id}
              className="block"
            >
              <Card className="gap-0 py-0 transition-colors hover:bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={assignment.status === "PUBLISHED" ? "default" : "secondary"}>
                      {assignmentStatusLabel(assignment.status)}
                    </Badge>
                    <span>Hạn nộp {formatDueAt(assignment.dueAt)}</span>
                    <span>{submissionProgress(assignment, memberCount)}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold">{assignment.title}</h2>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {assignment.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tạo bài tập</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAssignmentFormAction} className="space-y-3">
              <input type="hidden" name="courseId" value={courseId} />
              <Input name="title" placeholder="Tiêu đề" required />
              <Textarea name="description" placeholder="Mô tả" rows={5} required />
              <Input name="dueAt" type="datetime-local" min={datetimeLocalMinValue()} required />
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
