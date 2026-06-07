"use client"

import Link from "next/link"
import { ArrowLeft, PlusCircle } from "lucide-react"
import { useState, useTransition } from "react"

import { createClub } from "@/actions/clubs"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
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
import { cn } from "@/lib/utils"

export function NewClubForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <PageContainer variant="centered" className="max-w-3xl">
      <form
        className="flex flex-col gap-6"
        action={(formData) => {
          startTransition(async () => {
            setError(null)
            const result = await createClub(formData)

            if (!result.success) {
              setError(result.error ?? "Không thể tạo câu lạc bộ")
            }
          })
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/clubs"
            className={cn(buttonVariants({ variant: "ghost" }), "self-start")}
          >
            <ArrowLeft data-icon="inline-start" />
            Câu lạc bộ
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tạo câu lạc bộ</CardTitle>
            <CardDescription>
              Tạo không gian chính thức để điều hành thành viên, bài viết, sự kiện và hoạt động nội bộ của CLB.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-2" htmlFor="new-club-name">
              <span className="text-sm font-medium">Tên câu lạc bộ</span>
              <Input
                id="new-club-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ví dụ: CLB Tin học"
              />
            </label>

            <label className="flex flex-col gap-2" htmlFor="new-club-category">
              <span className="text-sm font-medium">Lĩnh vực</span>
              <Input
                id="new-club-category"
                name="category"
                maxLength={80}
                placeholder="Ví dụ: Công nghệ, Truyền thông, Nghệ thuật"
              />
            </label>

            <label className="flex flex-col gap-2" htmlFor="new-club-description">
              <span className="text-sm font-medium">Mô tả</span>
              <Textarea
                id="new-club-description"
                name="description"
                rows={5}
                maxLength={1000}
                placeholder="CLB này dành cho hoạt động nào, tuyển thành viên ra sao?"
              />
            </label>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">Chế độ hiển thị</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3" htmlFor="new-club-public">
                  <input
                    id="new-club-public"
                    className="mt-1"
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    defaultChecked
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Công khai</span>
                    <span className="text-xs text-muted-foreground">
                      Người dùng có thể tìm thấy và tự tham gia CLB.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3" htmlFor="new-club-private">
                  <input
                    id="new-club-private"
                    className="mt-1"
                    type="radio"
                    name="visibility"
                    value="PRIVATE"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Riêng tư</span>
                    <span className="text-xs text-muted-foreground">
                      Người dùng cần gửi yêu cầu và chờ quản trị viên duyệt.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="grid gap-3">
              <input type="hidden" name="requirePostApproval" value="false" />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3" htmlFor="new-club-approval">
                <input
                  id="new-club-approval"
                  className="mt-1"
                  type="checkbox"
                  name="requirePostApproval"
                  value="true"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Duyệt bài viết</span>
                  <span className="text-xs text-muted-foreground">
                    Bài viết của thành viên cần được quản trị viên duyệt trước khi hiển thị.
                  </span>
                </span>
              </label>

              <input type="hidden" name="chatEnabled" value="false" />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3" htmlFor="new-club-chat">
                <input
                  id="new-club-chat"
                  className="mt-1"
                  type="checkbox"
                  name="chatEnabled"
                  value="true"
                  defaultChecked
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Bật chat CLB</span>
                  <span className="text-xs text-muted-foreground">
                    CLB có kênh trao đổi riêng trong tin nhắn.
                  </span>
                </span>
              </label>

              <label className="flex flex-col gap-2" htmlFor="new-club-chat-mode">
                <span className="text-sm font-medium">Ai được gửi tin nhắn?</span>
                <select
                  id="new-club-chat-mode"
                  name="chatMode"
                  defaultValue="OPEN"
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="OPEN">Mọi thành viên</option>
                  <option value="ADMINS_ONLY">Chỉ quản trị viên</option>
                  <option value="READ_ONLY">Không cho gửi tin nhắn</option>
                </select>
              </label>

              <input type="hidden" name="memberInviteEnabled" value="false" />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3" htmlFor="new-club-invite">
                <input
                  id="new-club-invite"
                  className="mt-1"
                  type="checkbox"
                  name="memberInviteEnabled"
                  value="true"
                  defaultChecked
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Cho phép thành viên mời người khác</span>
                  <span className="text-xs text-muted-foreground">
                    Thành viên có thể gửi lời mời tham gia CLB cho người dùng khác.
                  </span>
                </span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Link href="/clubs" className={buttonVariants({ variant: "outline" })}>
              Hủy
            </Link>
            <Button type="submit" disabled={pending}>
              <PlusCircle data-icon="inline-start" />
              {pending ? "Đang tạo..." : "Tạo câu lạc bộ"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </PageContainer>
  )
}
