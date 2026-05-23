"use client"

import { useRef, useState, useTransition } from "react"
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"

import {
  confirmSchoolIdentityImport,
  createSchoolIdentityImportPreview,
} from "@/actions/school-identity-import"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type PreviewState = {
  batchId: string
  totalRows: number
  failedCount: number
  status: string
} | null

export function ImportUsersClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewState>(null)
  const [mode, setMode] = useState<"CREATE" | "UPDATE_EXISTING">("CREATE")
  const [passwordCsv, setPasswordCsv] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handlePreview = () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError("Vui lòng chọn file CSV hoặc Excel.")
      return
    }

    const formData = new FormData()
    formData.set("file", file)
    formData.set("mode", mode)
    setError("")
    setMessage("")
    setPasswordCsv("")

    startTransition(async () => {
      const result = await createSchoolIdentityImportPreview(formData)
      if (!result.success || !result.data) {
        setPreview(null)
        setError(result.error ?? "Không thể tạo bản xem trước.")
        return
      }

      setPreview(result.data)
      if (result.data.failedCount > 0) {
        setError("File import có lỗi. Vui lòng kiểm tra dữ liệu và upload lại.")
      } else {
        setMessage("Bản xem trước hợp lệ. Bạn có thể xác nhận để tạo tài khoản.")
      }
    })
  }

  const handleConfirm = () => {
    if (!preview) return
    setError("")
    setMessage("")

    startTransition(async () => {
      const result = await confirmSchoolIdentityImport(preview.batchId)
      if (!result.success || !result.data) {
        setError(result.error ?? "Không thể xác nhận import.")
        return
      }

      setPasswordCsv(result.data.csv)
      if (mode === "CREATE") {
        setMessage(`Đã tạo ${result.data.createdCount} tài khoản. Hãy tải file mật khẩu ngay.`)
      } else {
        setMessage("Đã cập nhật dữ liệu tài khoản trong kho trường.")
      }
    })
  }

  const downloadPasswords = () => {
    if (!passwordCsv) return
    const blob = new Blob([passwordCsv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "school-identity-passwords.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Import tài khoản trường"
        description="Upload CSV hoặc Excel để tạo tài khoản sinh viên, giảng viên và cán bộ. Mã tài khoản và mật khẩu được hệ thống tự sinh."
        secondaryActions={[
          { label: "Quay lại người dùng", href: "/admin/users", variant: "outline" },
        ]}
      />

      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">File tạo mới</h2>
            <p className="text-sm text-muted-foreground">
              Tạo mới cần <code>role</code>, <code>displayName</code>, <code>department</code>. Cập nhật cần thêm <code>code</code>. Cột tùy chọn: <code>status</code>, <code>className</code>, <code>cohort</code>, <code>jobTitle</code>.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "CREATE" ? "default" : "outline"}
              onClick={() => setMode("CREATE")}
            >
              Tạo mới
            </Button>
            <Button
              type="button"
              variant={mode === "UPDATE_EXISTING" ? "default" : "outline"}
              onClick={() => setMode("UPDATE_EXISTING")}
            >
              Cập nhật
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FileSpreadsheet className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="pl-9"
              />
            </div>
            <Button type="button" onClick={handlePreview} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Xem trước
            </Button>
          </div>

          {preview && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={preview.failedCount > 0 ? "destructive" : "secondary"}>
                  {preview.status}
                </Badge>
                <span>Tổng dòng: {preview.totalRows}</span>
                <span>Lỗi: {preview.failedCount}</span>
              </div>
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {message && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!preview || preview.failedCount > 0 || isPending || Boolean(passwordCsv)}
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Xác nhận tạo tài khoản
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadPasswords}
              disabled={!passwordCsv || mode !== "CREATE"}
            >
              <Download className="mr-2 size-4" />
              Tải file mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
