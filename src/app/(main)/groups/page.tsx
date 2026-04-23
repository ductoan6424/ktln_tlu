"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SearchInput } from "@/components/shared/search-input"
import { SectionHeader } from "@/components/shared/section-header"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageContainer } from "@/components/layout/page-container"
import {
  Plus,
  Users,
  MessageSquare,
  Lock,
  Globe,
} from "lucide-react"

const TABS = [
  { label: "Nhóm của tôi", value: "my" },
  { label: "Khám phá", value: "explore" },
  { label: "Đề xuất", value: "suggested" },
]

interface GroupData {
  id: string
  name: string
  description: string
  memberCount: number
  postCount: number
  isPrivate: boolean
  category: string
  coverImage: string
  isJoined: boolean
  recentMembers: string[]
}

const GROUPS: GroupData[] = [
  {
    id: "1",
    name: "Nhóm Học tập Giải tích",
    description: "Thảo luận và hỗ trợ nhau về các bài tập Giải tích 1, 2, 3. Chia sẻ tài liệu ôn thi.",
    memberCount: 245,
    postCount: 89,
    isPrivate: false,
    category: "Học tập",
    coverImage: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=200&fit=crop",
    isJoined: true,
    recentMembers: ["Trần Minh Thư", "Lê Văn Hùng", "Phạm Quốc Anh"],
  },
  {
    id: "2",
    name: "Lập trình Python TLU",
    description: "Cộng đồng lập trình Python dành cho sinh viên Thủy Lợi. Chia sẻ project, tips & tricks.",
    memberCount: 512,
    postCount: 234,
    isPrivate: false,
    category: "Công nghệ",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=200&fit=crop",
    isJoined: true,
    recentMembers: ["Nguyễn Thu Hà", "Hoàng Minh Tuấn"],
  },
  {
    id: "3",
    name: "NCKH - Trí tuệ nhân tạo",
    description: "Nhóm nghiên cứu khoa học về AI/ML. Trao đổi paper, dataset và kết quả thí nghiệm.",
    memberCount: 67,
    postCount: 45,
    isPrivate: true,
    category: "Nghiên cứu",
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=200&fit=crop",
    isJoined: true,
    recentMembers: ["Lương Hải Đăng", "Lê Văn Luyện", "Nguyễn Đức Toàn"],
  },
  {
    id: "4",
    name: "Ôn thi TOEIC 700+",
    description: "Cùng nhau luyện đề TOEIC, chia sẻ kinh nghiệm và tài liệu ôn thi hiệu quả.",
    memberCount: 380,
    postCount: 156,
    isPrivate: false,
    category: "Ngoại ngữ",
    coverImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=200&fit=crop",
    isJoined: false,
    recentMembers: ["Trần Văn Bình", "Nguyễn Thị Lan"],
  },
  {
    id: "5",
    name: "Thực tập & Việc làm CNTT",
    description: "Chia sẻ cơ hội thực tập, việc làm và kinh nghiệm phỏng vấn trong ngành CNTT.",
    memberCount: 890,
    postCount: 412,
    isPrivate: false,
    category: "Nghề nghiệp",
    coverImage: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=200&fit=crop",
    isJoined: false,
    recentMembers: ["Phạm Thị Hoa", "Đỗ Văn Nam", "Vũ Thị Mai"],
  },
  {
    id: "6",
    name: "K35 - CNTT Chung",
    description: "Nhóm chung của khóa K35 ngành Công nghệ thông tin. Thông báo, thảo luận chung.",
    memberCount: 120,
    postCount: 312,
    isPrivate: true,
    category: "Lớp học",
    coverImage: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600&h=200&fit=crop",
    isJoined: true,
    recentMembers: ["Lê Văn Luyện", "Lương Hải Đăng"],
  },
]

const SUGGESTED_GROUPS = [
  { name: "CLB Đi bộ TLU", members: 89, category: "Thể thao" },
  { name: "Câu cá cuối tuần", members: 34, category: "Giải trí" },
  { name: "Nhiếp ảnh TLU", members: 156, category: "Nghệ thuật" },
]

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState("my")

  const filteredGroups = activeTab === "my"
    ? GROUPS.filter((g) => g.isJoined)
    : activeTab === "suggested"
      ? GROUPS.filter((g) => !g.isJoined)
      : GROUPS

  return (
    <PageContainer variant="centered" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Nhóm</h1>
          <p className="text-sm text-muted-foreground">
            Tham gia nhóm để kết nối và học tập cùng nhau
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-4 mr-2" />
          Tạo nhóm
        </Button>
      </div>

      {/* Tìm kiếm + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SearchInput placeholder="Tìm kiếm nhóm..." className="sm:max-w-xs" />
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pill"
        />
      </div>

      {/* Nội dung chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách nhóm */}
        <section className="lg:col-span-2 space-y-4">
          {filteredGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}

          {filteredGroups.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold">Không tìm thấy nhóm</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hãy thử khám phá các nhóm khác
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Nhóm đề xuất */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Gợi ý cho bạn" className="mb-4" />
              <div className="space-y-4">
                {SUGGESTED_GROUPS.map((group) => (
                  <div key={group.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.members} thành viên
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs font-bold">
                      Tham gia
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Thống kê */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Thống kê" className="mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nhóm đã tham gia</span>
                  <span className="font-bold">4 nhóm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bài viết tuần này</span>
                  <span className="font-bold">12 bài</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nhóm hoạt động nhất</span>
                  <span className="font-bold text-primary">Lập trình Python</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quy tắc cộng đồng */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Quy tắc nhóm" className="mb-3" />
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Tôn trọng các thành viên trong nhóm
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Không chia sẻ nội dung vi phạm
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Đăng bài đúng chủ đề nhóm
                </li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */
/* Group Card                                                          */
/* ------------------------------------------------------------------ */
function GroupCard({ group }: { group: GroupData }) {
  return (
    <Card className="overflow-hidden group/card">
      {/* Ảnh bìa */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={group.coverImage}
          alt={group.name}
          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <StatusBadge variant={group.isPrivate ? "warning" : "info"}>
            {group.isPrivate ? (
              <span className="flex items-center gap-1"><Lock className="size-3" /> Riêng tư</span>
            ) : (
              <span className="flex items-center gap-1"><Globe className="size-3" /> Công khai</span>
            )}
          </StatusBadge>
          <StatusBadge variant="primary">{group.category}</StatusBadge>
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        <h3 className="text-base font-bold group-hover/card:text-primary transition-colors">
          {group.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {group.description}
        </p>

        {/* Thống kê */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {group.memberCount} thành viên
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            {group.postCount} bài viết
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex -space-x-2">
            {group.recentMembers.slice(0, 3).map((name) => (
              <UserAvatar key={name} name={name} size="sm" />
            ))}
            {group.memberCount > 3 && (
              <div className="size-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                +{group.memberCount - 3}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant={group.isJoined ? "outline" : "default"}
            className="text-xs font-bold"
          >
            {group.isJoined ? "Đã tham gia" : "Tham gia"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
