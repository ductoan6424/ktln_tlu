import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthLayout } from "@/components/layout/auth-layout"

export default async function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/feed")
  }

  return <AuthLayout>{children}</AuthLayout>
}
