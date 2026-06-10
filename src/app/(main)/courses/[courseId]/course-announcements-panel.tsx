import { createCourseAnnouncement } from "@/actions/course-learning"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CourseAnnouncementDto } from "@/lib/courses/course-learning"

type CourseAnnouncementsPanelProps = {
  courseId: string
  canManage: boolean
  announcements: CourseAnnouncementDto[]
}

function typeLabel(type: CourseAnnouncementDto["type"]) {
  const labels: Record<CourseAnnouncementDto["type"], string> = {
    GENERAL: "Chung",
    CLASS_CANCELLED: "Nghỉ học",
    SCHEDULE_CHANGE: "Đổi lịch/phòng",
    ASSIGNMENT_REMINDER: "Nhắc bài tập",
  }
  return labels[type]
}

async function createAnnouncementFormAction(formData: FormData) {
  "use server"
  await createCourseAnnouncement(formData)
}

export function CourseAnnouncementsPanel({
  courseId,
  canManage,
  announcements,
}: CourseAnnouncementsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-3">
        {announcements.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Chưa có thông báo lớp học.
          </div>
        ) : (
          announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{typeLabel(announcement.type)}</span>
                {announcement.priority === "IMPORTANT" ? <span>Quan trọng</span> : null}
                {announcement.isPinned ? <span>Đã ghim</span> : null}
                <span>{announcement.status}</span>
              </div>
              <h2 className="mt-2 text-base font-semibold">{announcement.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {announcement.content}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {announcement.authorName}
              </p>
            </article>
          ))
        )}
      </section>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tạo thông báo</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementFormAction} className="space-y-3">
              <input type="hidden" name="courseId" value={courseId} />
              <Input name="title" placeholder="Tiêu đề" required />
              <Textarea name="content" placeholder="Nội dung" rows={5} required />
              <select name="type" defaultValue="GENERAL" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="GENERAL">Chung</option>
                <option value="CLASS_CANCELLED">Nghỉ học</option>
                <option value="SCHEDULE_CHANGE">Đổi lịch/phòng</option>
                <option value="ASSIGNMENT_REMINDER">Nhắc bài tập</option>
              </select>
              <select name="priority" defaultValue="NORMAL" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="NORMAL">Thường</option>
                <option value="IMPORTANT">Quan trọng</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isPinned" value="true" />
                Ghim thông báo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="publish" value="true" />
                Đăng ngay
              </label>
              <Button type="submit" className="w-full">Tạo thông báo</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
