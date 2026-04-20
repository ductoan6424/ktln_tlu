import type { Metadata } from "next"
import { RegisterCard } from "@/components/auth/register-card"

export const metadata: Metadata = {
  title: "Đăng ký — TLU Community",
  description: "Tạo tài khoản mới để tham gia cộng đồng sinh viên Đại học Thủy lợi",
}

export default function RegisterPage() {
  return <RegisterCard />
}
