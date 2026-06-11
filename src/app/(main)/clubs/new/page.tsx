import { redirect } from "next/navigation"

import { getAuthorizationContext } from "@/lib/auth/authorization"

import { NewClubForm } from "./new-club-form"

export const metadata = {
  title: "Tạo câu lạc bộ",
  description: "Tạo câu lạc bộ mới để kết nối và tổ chức hoạt động sinh viên.",
}

export const dynamic = "force-dynamic"

export default async function NewClubPage() {
  const context = await getAuthorizationContext()

  if (!context) {
    redirect("/login")
  }

  return <NewClubForm />
}
