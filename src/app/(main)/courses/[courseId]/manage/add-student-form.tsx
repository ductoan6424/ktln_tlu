"use client"

import {
  type ChangeEvent,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import Image from "next/image"
import { FileSpreadsheet, ListPlus, QrCode, Search, Upload, UserPlus } from "lucide-react"

import {
  addStudentToCourse,
  addStudentsToCourseByCodes,
  searchCourseStudentCandidates,
} from "@/actions/courses"
import {
  managePrimaryButton,
  manageSecondaryButton,
  manageInput,
} from "@/components/communities/manage/manage-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { parseCsvRows, parseStudentCodesFromRows } from "@/lib/courses/student-import"

type StudentSuggestion = {
  userId: string
  displayName: string
  email: string
  avatarUrl: string | null
  studentId: string | null
}

type AddStudentFormProps = {
  courseId: string
  courseHref?: string
}

function formatBulkSummary(result: {
  added: string[]
  alreadyMember: string[]
  notFound: string[]
}) {
  return [
    `Đã thêm ${result.added.length}`,
    `Đã có ${result.alreadyMember.length}`,
    `Không tìm thấy ${result.notFound.length}`,
  ].join(" · ")
}

function getAbsoluteCourseUrl(courseHref: string) {
  if (typeof window === "undefined") return courseHref
  if (/^https?:\/\//i.test(courseHref)) return courseHref
  return `${window.location.origin}${courseHref}`
}

function subscribeToOriginChange(onStoreChange: () => void) {
  window.addEventListener("focus", onStoreChange)
  return () => window.removeEventListener("focus", onStoreChange)
}

function getBrowserOrigin() {
  return window.location.origin
}

function getServerOrigin() {
  return ""
}

async function parseRowsFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension === "csv") {
    return parseCsvRows(await file.text())
  }

  const { default: readXlsxFile } = await import("read-excel-file/browser")
  return (await readXlsxFile(file)) as unknown as unknown[][]
}

export function AddStudentForm({
  courseId,
  courseHref = `/courses/${courseId}`,
}: AddStudentFormProps) {
  const studentInputId = useId()
  const bulkInputId = useId()
  const importInputId = useId()
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState<string | null>(null)
  const [studentId, setStudentId] = useState("")
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([])
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [suggestionPending, setSuggestionPending] = useState(false)
  const [importPending, setImportPending] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const courseOrigin = useSyncExternalStore(
    subscribeToOriginChange,
    getBrowserOrigin,
    getServerOrigin,
  )

  const courseJoinUrl = /^https?:\/\//i.test(courseHref) || !courseOrigin
    ? courseHref
    : getAbsoluteCourseUrl(courseHref)

  useEffect(() => {
    let cancelled = false
    const query = studentId.trim()

    if (query.length < 2) {
      setSuggestions([])
      setSuggestionError(null)
      setSuggestionPending(false)
      return
    }

    setSuggestionPending(true)
    const timer = window.setTimeout(() => {
      if (cancelled) return

      searchCourseStudentCandidates({ courseId, query })
        .then((result) => {
          if (cancelled) return

          setSuggestionPending(false)
          if (!result.success) {
            setSuggestions([])
            setSuggestionError(result.error ?? "Không thể tải gợi ý sinh viên.")
            return
          }

          setSuggestionError(null)
          setSuggestions(result.data ?? [])
        })
        .catch(() => {
          if (cancelled) return
          setSuggestionPending(false)
          setSuggestions([])
          setSuggestionError("Không thể tải gợi ý sinh viên.")
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [courseId, studentId])

  useEffect(() => {
    let cancelled = false

    async function renderQrCode() {
      const QRCode = await import("qrcode")
      const dataUrl = await QRCode.toDataURL(courseJoinUrl, {
        width: 180,
        margin: 1,
      })

      if (!cancelled) setQrDataUrl(dataUrl)
    }

    renderQrCode().catch(() => {
      if (!cancelled) setQrDataUrl(null)
    })

    return () => {
      cancelled = true
    }
  }, [courseJoinUrl])

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const extension = file.name.split(".").pop()?.toLowerCase()
    if (!extension || !["csv", "xlsx"].includes(extension)) {
      setSummary("Chỉ hỗ trợ file CSV hoặc XLSX.")
      return
    }

    setImportPending(true)
    try {
      const rows = await parseRowsFromFile(file)
      const codes = parseStudentCodesFromRows(rows)
      if (codes.length === 0) {
        setSummary("Không tìm thấy mã sinh viên hợp lệ trong file.")
        return
      }

      const result = await addStudentsToCourseByCodes({
        courseId,
        studentCodesText: codes.join("\n"),
      })
      if (!result.success || !result.data) {
        setSummary(result.error ?? "Không thể import danh sách sinh viên.")
        return
      }

      setSummary(formatBulkSummary(result.data))
    } catch {
      setSummary("Không thể đọc file. Vui lòng kiểm tra lại định dạng.")
    } finally {
      setImportPending(false)
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        action={(formData) => {
          startTransition(async () => {
            const result = await addStudentToCourse({
              courseId,
              studentId: String(formData.get("studentId") ?? ""),
            })
            setSummary(
              result.success
                ? "Đã thêm sinh viên."
                : result.error ?? "Không thể thêm sinh viên.",
            )
            if (result.success) {
              setStudentId("")
              setSuggestions([])
            }
          })
        }}
      >
        <label className="block space-y-2" htmlFor={studentInputId}>
          <span className="text-sm font-semibold text-foreground">Mã sinh viên</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={studentInputId}
              name="studentId"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="A46287"
              required
              autoComplete="off"
              className={`${manageInput} pl-9`}
            />
          </span>
        </label>

        {suggestionPending ? (
          <p className="text-xs text-muted-foreground">Đang tìm sinh viên…</p>
        ) : suggestionError ? (
          <p className="text-xs text-destructive">{suggestionError}</p>
        ) : suggestions.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {suggestions.map((student) => (
              <button
                key={student.userId}
                type="button"
                className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                onClick={() => setStudentId(student.studentId ?? "")}
              >
                <span className="text-sm font-semibold text-foreground">
                  {student.studentId} · {student.displayName}
                </span>
                <span className="text-xs text-muted-foreground">{student.email}</span>
              </button>
            ))}
          </div>
        ) : studentId.trim().length >= 2 ? (
          <p className="text-xs text-muted-foreground">Không có gợi ý phù hợp.</p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className={managePrimaryButton}
        >
          <UserPlus data-icon="inline-start" />
          {pending ? "Đang thêm…" : "Thêm sinh viên"}
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <QrCode className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">QR tham gia lớp</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Sinh viên quét mã để mở trang lớp và gửi yêu cầu tham gia.
              </p>
            </div>
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="QR tham gia lớp học"
                width={144}
                height={144}
                unoptimized
                className="size-36 rounded-md border border-border bg-card p-2"
              />
            ) : (
              <div className="flex size-36 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                Đang tạo QR…
              </div>
            )}
            <p className="break-all text-xs text-muted-foreground">{courseJoinUrl}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <label className="block space-y-2" htmlFor={importInputId}>
          <span className="text-sm font-semibold text-foreground">Import CSV/Excel</span>
          <span className="text-xs leading-5 text-muted-foreground">
            Nhận cột studentId, student_id, mã sinh viên hoặc ma sinh vien; nếu không có header sẽ lấy cột đầu tiên.
          </span>
          <Input
            id={importInputId}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleImportFile}
            disabled={importPending || pending}
            className={manageInput}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          disabled={importPending || pending}
          className={manageSecondaryButton}
          onClick={() => document.getElementById(importInputId)?.click()}
        >
          <Upload data-icon="inline-start" />
          {importPending ? "Đang import…" : "Chọn file import"}
        </Button>
      </div>

      <form
        className="space-y-3 border-t border-border pt-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await addStudentsToCourseByCodes({
              courseId,
              studentCodesText: String(formData.get("studentCodesText") ?? ""),
            })
            if (!result.success || !result.data) {
              setSummary(result.error ?? "Không thể thêm danh sách sinh viên.")
              return
            }

            setSummary(formatBulkSummary(result.data))
          })
        }}
      >
        <label className="block space-y-2" htmlFor={bulkInputId}>
          <span className="text-sm font-semibold text-foreground">
            Thêm nhiều mã sinh viên
          </span>
          <Textarea
            id={bulkInputId}
            name="studentCodesText"
            placeholder="A46287, A46288 hoặc mỗi mã một dòng"
            className={`${manageInput} min-h-28`}
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className={manageSecondaryButton}
        >
          <ListPlus data-icon="inline-start" />
          {pending ? "Đang thêm…" : "Thêm danh sách"}
        </Button>
      </form>

      {summary ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheet className="size-4" aria-hidden="true" />
          <span>{summary}</span>
        </p>
      ) : null}
    </div>
  )
}
