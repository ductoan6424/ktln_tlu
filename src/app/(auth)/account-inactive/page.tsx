import { AuthStatusCard } from "@/components/auth/auth-status-card"

export default function AccountInactivePage() {
  return (
    <div className="flex w-full items-center justify-center">
      <AuthStatusCard
        variant="warning"
        title="Tài khoản không hoạt động"
        description="Tài khoản của bạn hiện không hoạt động. Vui lòng liên hệ quản trị viên hoặc phòng ban phụ trách để được hỗ trợ."
        actions={[{ label: "Quay về đăng nhập", href: "/login" }]}
      />
    </div>
  )
}
