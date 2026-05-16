"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchInput } from "@/components/shared/search-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, UserPlus, Shield, Crown, Trash2 } from "lucide-react"

interface Member {
  id: string
  name: string
  avatar?: string
  role: "admin" | "moderator" | "member"
  joinedAt: string
  email?: string
}

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Nguyễn Văn An", role: "admin", joinedAt: "12/09/2024", email: "an.nv@tlu.edu.vn" },
  { id: "2", name: "Trần Minh Đức", role: "admin", joinedAt: "15/09/2024", email: "duc.tm@tlu.edu.vn" },
  { id: "3", name: "Lê Thị Hương", role: "admin", joinedAt: "20/09/2024", email: "huong.lt@tlu.edu.vn" },
  { id: "4", name: "Phạm Hoàng Nam", role: "moderator", joinedAt: "01/10/2024" },
  { id: "5", name: "Đỗ Minh Tuấn", role: "member", joinedAt: "05/10/2024" },
  { id: "6", name: "Bùi Thu Hà", role: "member", joinedAt: "10/10/2024" },
  { id: "7", name: "Ngô Đức Minh", role: "member", joinedAt: "15/10/2024" },
  { id: "8", name: "Trịnh Thanh Hà", role: "moderator", joinedAt: "20/10/2024" },
  { id: "9", name: "Vũ Khánh Linh", role: "member", joinedAt: "25/10/2024" },
  { id: "10", name: "Đặng Quang Minh", role: "member", joinedAt: "30/10/2024" },
]

const ROLE_LABELS = {
  admin: "Chủ nhiệm",
  moderator: "Phó",
  member: "Thành viên",
}

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700",
  moderator: "bg-blue-100 text-blue-700",
  member: "bg-muted text-muted-foreground",
}

export function MemberManageList() {
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")

  const filtered = MOCK_MEMBERS.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === "all" || m.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder="Tìm thành viên..."
            value={search}
            onChange={setSearch}
            className="w-64"
          />
          <div className="flex gap-2">
            {["all", "admin", "moderator", "member"].map((role) => (
              <Button
                key={role}
                variant={filterRole === role ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRole(role)}
              >
                {role === "all" ? "Tất cả" : ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
              </Button>
            ))}
          </div>
        </div>
        <Button>
          <UserPlus className="size-4 mr-2" />
          Mời thành viên
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{MOCK_MEMBERS.length}</p>
            <p className="text-sm text-muted-foreground">Tổng thành viên</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {MOCK_MEMBERS.filter((m) => m.role === "admin").length}
            </p>
            <p className="text-sm text-muted-foreground">Chủ nhiệm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {MOCK_MEMBERS.filter((m) => m.role === "moderator").length}
            </p>
            <p className="text-sm text-muted-foreground">Phó</p>
          </CardContent>
        </Card>
      </div>

      {/* Member list */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="size-10">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{member.name}</p>
                {member.email && (
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                )}
              </div>
              <Badge className={ROLE_COLORS[member.role]}>
                {ROLE_LABELS[member.role]}
              </Badge>
              <p className="text-xs text-muted-foreground shrink-0">
                {member.joinedAt}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Shield className="size-4 mr-2" />
                    Đặt làm Chủ nhiệm
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Crown className="size-4 mr-2" />
                    Đặt làm Phó
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="size-4 mr-2" />
                    Xoá khỏi nhóm
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Không tìm thấy thành viên nào
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
