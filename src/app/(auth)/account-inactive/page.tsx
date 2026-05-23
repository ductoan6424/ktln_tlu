import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AccountInactivePage() {
  return (
    <div className="flex w-full items-center justify-center">
      <Card className="w-full max-w-md shadow-2xl border">
        <CardContent className="space-y-6 p-5 text-center sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Tài khoản không hoạt động</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tài khoản của bạn hiện không hoạt động. Vui lòng liên hệ quản trị viên hoặc phòng ban phụ trách để được hỗ trợ.
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
