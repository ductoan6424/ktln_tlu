import { notFound } from "next/navigation"

import { AdminDetailSection } from "@/components/admin/module/admin-detail-section"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { AccountStatusCard } from "@/components/admin/users/account-status-card"
import { UserActivityPanel } from "@/components/admin/users/user-activity-panel"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  getAdminUserDetail,
  getUsersAdminModule,
} from "@/lib/admin/users/users-admin-data"
import { cn } from "@/lib/utils"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const [usersModule, detail] = await Promise.all([
    getUsersAdminModule(),
    getAdminUserDetail(userId),
  ])

  if (!detail || !usersModule.getRecord(userId)) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={detail.user.displayName}
        description={detail.user.email}
        primaryAction={{
          label: "Chỉnh sửa phân quyền",
          href: `/admin/users/${detail.user.userId}/edit`,
        }}
        secondaryActions={[
          { label: "Quay lại danh sách", href: "/admin/users", variant: "outline" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <AdminDetailSection
            section={{
              title: "Hồ sơ cơ bản",
              items: [
                { label: "Họ và tên", value: detail.user.displayName },
                { label: "Email", value: detail.user.email },
                { label: "Vai trò nền", value: detail.user.baseRoleLabel },
                {
                  label: "Mã sinh viên",
                  value: detail.user.studentId ?? "Chưa cập nhật",
                },
                { label: "Khoa", value: detail.user.major ?? "Chưa cập nhật" },
              ],
            }}
          />
          <AdminDetailSection
            section={{
              title: "RBAC quản trị",
              items: [
                {
                  label: "Gói quyền",
                  value:
                    detail.user.adminRoleNames.length > 0
                      ? detail.user.adminRoleNames.join(", ")
                      : "Chưa được cấp",
                },
              ],
            }}
          />
        </div>

        <AccountStatusCard
          userId={detail.user.userId}
          displayName={detail.user.displayName}
          accountState={detail.accountState}
        />
      </div>

      <UserActivityPanel detail={detail} />

      <a
        href={`/admin/moderation?user=${detail.user.userId}`}
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Mở mục kiểm duyệt liên quan
      </a>
    </div>
  )
}
