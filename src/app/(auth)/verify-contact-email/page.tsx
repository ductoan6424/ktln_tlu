import { redirect } from "next/navigation"

import { verifyContactEmail } from "@/actions/contact-email"
import { AuthStatusCard } from "@/components/auth/auth-status-card"
import { createClient } from "@/lib/supabase/server"

interface VerifyContactEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyContactEmailPage({
  searchParams,
}: VerifyContactEmailPageProps) {
  const { token } = await searchParams
  const result = token
    ? await verifyContactEmail(token)
    : { success: false, error: "Không có mã xác thực." }

  if (result.success) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect("/feed")
  }

  return (
    <div className="flex w-full items-center justify-center">
      <AuthStatusCard
        variant={result.success ? "success" : "error"}
        title={result.success ? "Xác thực thành công" : "Xác thực thất bại"}
        description={
          result.success
            ? "Email liên hệ của bạn đã được xác thực. Bạn có thể đăng nhập để tiếp tục."
            : result.error ?? "Liên kết xác thực không hợp lệ."
        }
        actions={[{ label: "Quay về đăng nhập", href: "/login" }]}
      />
    </div>
  )
}
