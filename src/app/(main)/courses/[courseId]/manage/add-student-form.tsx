"use client"

import { useState, useTransition } from "react"
import { ListPlus, UserPlus } from "lucide-react"

import { addStudentToCourse, addStudentsToCourseByCodes } from "@/actions/courses"
import {
  facebookPrimaryButton,
  facebookSecondaryButton,
  manageInput,
} from "@/components/communities/manage/manage-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function AddStudentForm({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        action={(formData) => {
          startTransition(async () => {
            const result = await addStudentToCourse({
              courseId,
              studentId: String(formData.get("studentId") ?? ""),
            })
            setSummary(
              result.success
                ? "Đã thêm sinh viên."
                : result.error ?? "Không thể thêm sinh viên.",
            )
          })
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#050505]">Mã sinh viên</span>
          <Input
            name="studentId"
            placeholder="A46287"
            required
            className={manageInput}
          />
        </label>
        <Button
          type="submit"
          disabled={pending}
          className={facebookPrimaryButton}
        >
          <UserPlus data-icon="inline-start" />
          {pending ? "Đang thêm..." : "Thêm sinh viên"}
        </Button>
      </form>

      <form
        className="space-y-3 border-t border-[#e4e6eb] pt-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await addStudentsToCourseByCodes({
              courseId,
              studentCodesText: String(formData.get("studentCodesText") ?? ""),
            })
            if (!result.success || !result.data) {
              setSummary(result.error ?? "Không thể thêm danh sách sinh viên.")
              return
            }

            setSummary(
              [
                `Đã thêm ${result.data.added.length}`,
                `Đã có ${result.data.alreadyMember.length}`,
                `Không tìm thấy ${result.data.notFound.length}`,
              ].join(" · "),
            )
          })
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#050505]">
            Thêm nhiều mã sinh viên
          </span>
          <Textarea
            name="studentCodesText"
            placeholder="A46287, A46288 hoặc mỗi mã một dòng"
            className={`${manageInput} min-h-28`}
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className={facebookSecondaryButton}
        >
          <ListPlus data-icon="inline-start" />
          {pending ? "Đang thêm..." : "Thêm danh sách"}
        </Button>
      </form>

      {summary ? <p className="text-sm text-[#65676b]">{summary}</p> : null}
    </div>
  )
}
