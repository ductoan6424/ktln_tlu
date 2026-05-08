"use client"

import { useState } from "react"
import { MessageSquare, Pin, Settings, ShieldAlert, UserPlus, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { TabNavigation } from "@/components/shared/tab-navigation"

import { AddStudentForm } from "./add-student-form"

const MANAGE_TABS = [
  { label: "Thành viên", value: "members", icon: Users },
  { label: "Yêu cầu tham gia", value: "requests", icon: UserPlus },
  { label: "Lời mời", value: "invites", icon: UserPlus },
  { label: "Bài chờ duyệt", value: "pending-posts", icon: ShieldAlert },
  { label: "Bài ghim", value: "pinned", icon: Pin },
  { label: "Báo cáo", value: "reports", icon: ShieldAlert },
  { label: "Quy định", value: "rules", icon: ShieldAlert },
  { label: "Chat", value: "chat", icon: MessageSquare },
  { label: "Cài đặt", value: "settings", icon: Settings },
]

interface CourseManageTabsProps {
  course: {
    id: string
    name: string
    code: string
    description: string | null
    members: Array<{
      user: {
        userId: string
        displayName: string
        studentId: string | null
      }
    }>
  }
}

export function CourseManageTabs({ course }: CourseManageTabsProps) {
  const [activeTab, setActiveTab] = useState("members")
  const activeLabel =
    MANAGE_TABS.find((tab) => tab.value === activeTab)?.label ?? "Quản lý"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý lớp học</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.name} · {course.code}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <TabNavigation tabs={MANAGE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </CardContent>
      </Card>

      {activeTab === "members" ? (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Thêm sinh viên</h2>
                <p className="text-sm text-muted-foreground">
                  Thêm một hoặc nhiều sinh viên vào lớp bằng mã sinh viên.
                </p>
              </div>
              <AddStudentForm courseId={course.id} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Danh sách lớp</h2>
                <p className="text-sm text-muted-foreground">
                  Tổng {course.members.length} sinh viên đã được thêm vào lớp học.
                </p>
              </div>
              <div className="space-y-3">
                {course.members.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Chưa có sinh viên nào trong lớp học này.
                  </p>
                ) : (
                  course.members.map((member) => (
                    <div key={member.user.userId} className="rounded-lg border px-4 py-3">
                      <p className="font-medium">{member.user.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.studentId ?? "Chưa có mã sinh viên"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "settings" ? (
        <Card>
          <CardContent className="space-y-2 p-5">
            <h2 className="text-lg font-semibold">Thông tin lớp học</h2>
            <p className="text-sm text-muted-foreground">
              {course.description ?? "Giảng viên chưa cập nhật mô tả cho lớp học này."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {activeLabel} sẽ được thao tác trong bảng quản lý lớp học này.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
