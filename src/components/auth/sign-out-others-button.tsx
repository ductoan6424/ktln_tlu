"use client"

import { useState, useTransition } from "react"
import { LogOut } from "lucide-react"

import { signOutOtherSessions } from "@/actions/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

// Nút đăng xuất khỏi tất cả thiết bị KHÁC. Phiên hiện tại được giữ nguyên.
// Sử dụng Supabase signOut với scope='others' (revoke mọi refresh token khác).
export function SignOutOthersButton() {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await signOutOtherSessions()
      if (!result.success) {
        toast({
          title: "Không thực hiện được",
          description: result.error,
          variant: "destructive",
        })
        setOpen(false)
        return
      }
      toast({
        title: "Đã đăng xuất khỏi các thiết bị khác",
        description: "Phiên hiện tại của bạn vẫn được giữ nguyên.",
      })
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        <LogOut className="size-4" />
        Đăng xuất khỏi tất cả thiết bị khác
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Đăng xuất khỏi mọi thiết bị khác?</AlertDialogTitle>
          <AlertDialogDescription>
            Tất cả phiên đăng nhập trên các thiết bị khác sẽ bị thu hồi ngay lập tức. Phiên hiện tại trên thiết bị này được giữ nguyên.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={pending}>
            {pending ? "Đang xử lý..." : "Đăng xuất"}
          </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
