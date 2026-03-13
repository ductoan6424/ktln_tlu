"use client"

import { AnnouncementForm } from "@/components/admin/announcement-form"
import { AnnouncementPreview } from "@/components/admin/announcement-preview"
import { ProTipCard } from "@/components/admin/pro-tip-card"

export default function AnnouncementsPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Cột trái — Form soạn thảo */}
      <div className="flex-1">
        <AnnouncementForm />
      </div>

      {/* Cột phải — Preview + Mẹo */}
      <div className="w-full lg:w-[400px] shrink-0 space-y-6">
        <AnnouncementPreview />
        <ProTipCard
          description="Sử dụng công cụ AI Tóm tắt để tự động tạo các gạch đầu dòng thân thiện cho sinh viên. Tỷ lệ tương tác tăng 40% với các bản tóm tắt ngắn gọn!"
        />
      </div>
    </div>
  )
}
