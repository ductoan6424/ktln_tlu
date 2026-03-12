"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/shared/search-input"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const TABS = [
  { label: "Tất cả (2,847)", value: "all" },
  { label: "Sinh viên (2,412)", value: "student" },
  { label: "Giảng viên (380)", value: "lecturer" },
  { label: "Quản trị (55)", value: "admin" },
]

interface UserData {
  id: string
  name: string
  email: string
  role: "student" | "lecturer" | "admin"
  status: "active" | "inactive" | "suspended"
  department: string
  joinDate: string
}

const USERS: UserData[] = [
  {
    id: "1",
    name: "Nguyễn Đức Toàn",
    email: "toan@e.tlu.edu.vn",
    role: "student",
    status: "active",
    department: "Công nghệ thông tin",
    joinDate: "15/09/2022",
  },
  {
    id: "2",
    name: "Trần Minh Thư",
    email: "thu@e.tlu.edu.vn",
    role: "student",
    status: "active",
    department: "Công nghệ thông tin",
    joinDate: "15/09/2022",
  },
  {
    id: "3",
    name: "PGS.TS Nguyễn Văn Trung",
    email: "trung@tlu.edu.vn",
    role: "lecturer",
    status: "active",
    department: "Công nghệ thông tin",
    joinDate: "01/03/2020",
  },
  {
    id: "4",
    name: "Lê Văn Hùng",
    email: "hung@e.tlu.edu.vn",
    role: "student",
    status: "inactive",
    department: "Kỹ thuật xây dựng",
    joinDate: "15/09/2023",
  },
  {
    id: "5",
    name: "Phạm Quốc Anh",
    email: "anh@e.tlu.edu.vn",
    role: "student",
    status: "active",
    department: "Kinh tế & Quản lý",
    joinDate: "15/09/2021",
  },
  {
    id: "6",
    name: "TS. Hoàng Minh Tuấn",
    email: "tuan@tlu.edu.vn",
    role: "lecturer",
    status: "active",
    department: "Công nghệ thông tin",
    joinDate: "01/09/2019",
  },
  {
    id: "7",
    name: "Nguyễn Thu Hà",
    email: "ha@e.tlu.edu.vn",
    role: "student",
    status: "suspended",
    department: "Môi trường",
    joinDate: "15/09/2023",
  },
  {
    id: "8",
    name: "Admin Hệ thống",
    email: "admin@tlu.edu.vn",
    role: "admin",
    status: "active",
    department: "Phòng CNTT",
    joinDate: "01/01/2020",
  },
]

const ROLE_LABELS: Record<string, string> = {
  student: "Sinh viên",
  lecturer: "Giảng viên",
  admin: "Quản trị",
}

const ROLE_VARIANTS: Record<string, "primary" | "info" | "accent"> = {
  student: "primary",
  lecturer: "info",
  admin: "accent",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  suspended: "Bị khoá",
}

const STATUS_VARIANTS: Record<string, "success" | "muted" | "accent"> = {
  active: "success",
  inactive: "muted",
  suspended: "accent",
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState("all")

  const filteredUsers = activeTab === "all"
    ? USERS
    : USERS.filter((u) => u.role === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tài khoản sinh viên, giảng viên và quản trị viên
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Xuất Excel
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Tìm kiếm + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SearchInput placeholder="Tìm theo tên, email..." className="sm:max-w-xs" />
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pill"
        />
      </div>

      {/* Bảng người dùng */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Người dùng
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Vai trò
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Khoa
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Trạng thái
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Ngày tham gia
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground px-5 py-3">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={ROLE_VARIANTS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-muted-foreground">{user.department}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={STATUS_VARIANTS[user.status]}>
                        {STATUS_LABELS[user.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-muted-foreground">{user.joinDate}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Hiển thị <span className="font-semibold">1-{filteredUsers.length}</span> trên{" "}
              <span className="font-semibold">{filteredUsers.length}</span> kết quả
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-8" disabled>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="default" size="icon" className="size-8">
                1
              </Button>
              <Button variant="outline" size="icon" className="size-8">
                2
              </Button>
              <Button variant="outline" size="icon" className="size-8">
                3
              </Button>
              <Button variant="outline" size="icon" className="size-8">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminUsersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-9 w-56" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            <div className="px-5 py-3 border-b">
              <Skeleton className="h-4 w-full" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b last:border-0">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
