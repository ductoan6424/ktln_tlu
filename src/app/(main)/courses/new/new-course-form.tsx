"use client"

import { useTransition } from "react"

import { createCourse } from "@/actions/courses"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function NewCourseForm() {
  const [pending, startTransition] = useTransition()

  return (
    <PageContainer variant="centered">
      <form
        className="space-y-6"
        action={(formData) => {
          startTransition(async () => {
            await createCourse(formData)
          })
        }}
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Tạo lớp học</h1>
              <p className="text-sm text-muted-foreground">
                Chỉ giảng viên và quản trị viên mới có thể mở lớp học trong hệ thống.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Tên lớp học</span>
              <Input name="name" required />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Mã môn học</span>
              <Input name="code" required />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Mô tả</span>
              <Textarea name="description" rows={5} />
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Đang tạo..." : "Tạo lớp học"}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
