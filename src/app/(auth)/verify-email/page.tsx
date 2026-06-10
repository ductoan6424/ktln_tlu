// src/app/(auth)/verify-email/page.tsx
import { verifyEmail } from "@/actions/auth"
import { AuthStatusCard } from "@/components/auth/auth-status-card"

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex w-full items-center justify-center">
        <AuthStatusCard
          variant="error"
          title="Liên kết không hợp lệ"
          description="Không có mã xác minh trong liên kết."
          actions={[{ label: "Quay về đăng nhập", href: "/login" }]}
        />
      </div>
    )
  }

  const result = await verifyEmail(token)

  return (
    <div className="flex w-full items-center justify-center">
      <AuthStatusCard
        variant={result.success ? "success" : "error"}
        title={result.success ? "Xác minh thành công!" : "Xác minh thất bại"}
        description={
          result.success
            ? "Tài khoản của bạn đã được xác minh. Bây giờ bạn có thể đăng nhập."
            : result.error ?? "Xác minh thất bại."
        }
        actions={[{
          label: result.success ? "Đăng nhập ngay" : "Quay về đăng nhập",
          href: "/login",
        }]}
      />
    </div>
  )
}
