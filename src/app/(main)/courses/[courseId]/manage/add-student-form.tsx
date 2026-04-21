"use client"

import { useTransition } from "react"

import { addStudentToCourse } from "@/actions/courses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AddStudentForm({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          await addStudentToCourse({
            courseId,
            studentId: String(formData.get("studentId") ?? ""),
          })
        })
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium">Mã sinh viên</span>
        <Input name="studentId" placeholder="A46287" required />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang thêm..." : "Thêm sinh viên"}
      </Button>
    </form>
  )
}
