import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"

import { verifyContactEmail } from "@/actions/contact-email"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
      <Card className="w-full max-w-md shadow-2xl border">
        <CardContent className="space-y-6 p-5 text-center sm:p-8">
          <div className="flex justify-center">
            <div className={`flex size-16 items-center justify-center rounded-full ${result.success ? "bg-emerald-100" : "bg-destructive/10"}`}>
              {result.success ? (
                <CheckCircle className="size-8 text-emerald-600" />
              ) : (
                <XCircle className="size-8 text-destructive" />
              )}
            </div>
          </div>
          <div>
            <h1 className={`text-xl font-semibold ${result.success ? "text-emerald-600" : "text-destructive"}`}>
              {result.success ? "Xác thực thành công" : "Xác thực thất bại"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.success
                ? "Email liên hệ của bạn đã được xác thực. Bạn có thể đăng nhập để tiếp tục."
                : result.error ?? "Liên kết xác thực không hợp lệ."}
            </p>
          </div>
          <Button className="w-full" render={<Link href="/login" />}>
            Quay về đăng nhập
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
