import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function AdminGroupSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cài đặt nhóm"
        description="Các cài đặt nhóm hiện được quản lý riêng trên từng nhóm."
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/groups", variant: "outline" },
        ]}
      />
      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-lg font-semibold">Cấu hình theo từng nhóm</h2>
          <p className="text-sm text-muted-foreground">
            Hãy mở chi tiết nhóm để thay đổi quyền riêng tư, duyệt bài viết,
            chat, lời mời và vai trò thành viên.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
