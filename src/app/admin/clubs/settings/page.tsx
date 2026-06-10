import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function AdminClubSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Cài đặt câu lạc bộ"
        description="Các cài đặt CLB hiện được quản lý riêng trên từng câu lạc bộ."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/clubs", variant: "outline" },
        ]}
      />
      <Card>
        <CardContent className="flex flex-col gap-2 p-6">
          <h2 className="text-lg font-semibold">Cấu hình theo từng câu lạc bộ</h2>
          <p className="text-sm text-muted-foreground">
            Hãy mở chi tiết CLB để thay đổi lĩnh vực, quyền riêng tư, duyệt bài viết,
            chat, lời mời và vai trò thành viên.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
