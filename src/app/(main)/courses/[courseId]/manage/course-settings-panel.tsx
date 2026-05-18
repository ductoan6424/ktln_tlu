"use client"

import { useState, useTransition } from "react"
import { FileText, Flag, Save, UserCheck, Users, type LucideIcon } from "lucide-react"

import { updateCourseSettings } from "@/actions/courses"
import {
  facebookPrimaryButton,
  manageHeader,
  manageInput,
  manageSoftItem,
  manageSurface,
} from "@/components/communities/manage/manage-ui"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type CourseSettingsPanelProps = {
  courseId: string
  name: string
  code: string
  description: string | null
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: "OPEN" | "ADMINS_ONLY" | "READ_ONLY"
  memberCount: number
  requestCount: number
  pendingPostCount: number
  reportCount: number
}

type StatItem = {
  label: string
  value: number
  icon: LucideIcon
}

export function CourseSettingsPanel({
  courseId,
  name,
  code,
  description,
  requirePostApproval,
  chatEnabled,
  chatMode,
  memberCount,
  requestCount,
  pendingPostCount,
  reportCount,
}: CourseSettingsPanelProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stats: StatItem[] = [
    { label: "Sinh viên", value: memberCount, icon: Users },
    { label: "Yêu cầu chờ", value: requestCount, icon: UserCheck },
    { label: "Bài chờ duyệt", value: pendingPostCount, icon: FileText },
    { label: "Báo cáo mở", value: reportCount, icon: Flag },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label} className={`${manageSurface} gap-2 py-4`}>
              <CardContent className="flex items-center gap-3 px-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[#65676b]">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-[#050505]">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className={`${manageSurface} gap-0 py-0`}>
        <CardHeader className={manageHeader}>
          <CardTitle className="text-lg font-bold text-[#050505]">
            Cập nhật lớp học
          </CardTitle>
          <CardDescription className="text-[#65676b]">
            Cập nhật thông tin, duyệt bài và quyền gửi tin nhắn trong lớp.
          </CardDescription>
        </CardHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              setError(null)
              setMessage(null)
              const result = await updateCourseSettings(formData)
              if (!result.success) {
                setError(result.error ?? "Không thể cập nhật lớp học")
                return
              }
              setMessage("Đã cập nhật lớp học.")
            })
          }}
        >
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <input type="hidden" name="courseId" value={courseId} />

            <label className="flex flex-col gap-2" htmlFor="field-app-main-courses-courseid-manage-course-settings-panel-1">
              <span className="text-sm font-semibold text-[#050505]">
                Tên lớp học
              </span>
              <Input id="field-app-main-courses-courseid-manage-course-settings-panel-1" name="name" defaultValue={name} required className={manageInput} />
            </label>

            <label className="flex flex-col gap-2" htmlFor="field-app-main-courses-courseid-manage-course-settings-panel-2">
              <span className="text-sm font-semibold text-[#050505]">
                Mã môn học
              </span>
              <Input id="field-app-main-courses-courseid-manage-course-settings-panel-2" name="code" defaultValue={code} required className={manageInput} />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2" htmlFor="field-app-main-courses-courseid-manage-course-settings-panel-3">
              <span className="text-sm font-semibold text-[#050505]">Mô tả</span>
              <Textarea
                name="description"
                defaultValue={description ?? ""}
                className={manageInput}
              id="field-app-main-courses-courseid-manage-course-settings-panel-3"

              />
            </label>

            <label className="flex flex-col gap-2" htmlFor="field-app-main-courses-courseid-manage-course-settings-panel-4">
              <span className="text-sm font-semibold text-[#050505]">
                Chế độ chat
              </span>
              <select
                name="chatMode"
                defaultValue={chatMode}
                className={`${manageInput} h-10 px-3 text-sm`}
               id="field-app-main-courses-courseid-manage-course-settings-panel-4">
                <option value="OPEN">Mọi thành viên</option>
                <option value="ADMINS_ONLY">Chỉ giảng viên/quản lý</option>
                <option value="READ_ONLY">Không cho gửi tin nhắn</option>
              </select>
            </label>

            <input type="hidden" name="requirePostApproval" value="false" />
            <label className={`${manageSoftItem} flex cursor-pointer items-start gap-3`}>
              <input
                className="mt-1 accent-[#1877f2]"
                type="checkbox"
                name="requirePostApproval"
                value="true"
                defaultChecked={requirePostApproval}
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[#050505]">
                  Yêu cầu duyệt bài
                </span>
                <span className="text-xs leading-5 text-[#65676b]">
                  Bài viết của sinh viên cần được duyệt trước khi hiển thị.
                </span>
              </span>
            </label>

            <input type="hidden" name="chatEnabled" value="false" />
            <label className={`${manageSoftItem} flex cursor-pointer items-start gap-3 sm:col-span-2`}>
              <input
                className="mt-1 accent-[#1877f2]"
                type="checkbox"
                name="chatEnabled"
                value="true"
                defaultChecked={chatEnabled}
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[#050505]">
                  Bật chat lớp học
                </span>
                <span className="text-xs leading-5 text-[#65676b]">
                  Khi tắt, sinh viên không thể gửi tin nhắn trong phòng chat lớp.
                </span>
              </span>
            </label>

            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            {message ? (
              <p className="text-sm text-[#65676b] sm:col-span-2">{message}</p>
            ) : null}
          </CardContent>

          <CardFooter className="justify-end border-t border-[#dddfe2] bg-[#f7f8fa]">
            <Button
              type="submit"
              disabled={pending}
              className={facebookPrimaryButton}
            >
              <Save data-icon="inline-start" />
              {pending ? "Đang lưu..." : "Lưu lớp học"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
