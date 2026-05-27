"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { register } from "@/actions/auth"
import { cn } from "@/lib/utils"
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
} from "lucide-react"
import Link from "next/link"

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Yếu", color: "bg-destructive" }
  if (score <= 3) return { score, label: "Trung bình", color: "bg-warning" }
  if (score <= 4) return { score, label: "Khá mạnh", color: "bg-success" }
  return { score, label: "Mạnh", color: "bg-success" }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  const steps = Array.from({ length: totalSteps }, (_, stepIndex) => stepIndex + 1)

  return (
    <div className="mb-6 flex items-center justify-center gap-2 sm:mb-8">
      {steps.map((step) => (
        <div key={`step-${step}`} className="flex items-center gap-2">
          <div
            className={cn(
              "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
              step < currentStep
                ? "bg-primary text-primary-foreground"
                : step === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {step < currentStep ? <Check className="size-3.5" /> : step}
          </div>
          {step < totalSteps && (
            <div
              className={cn(
                "h-px w-6 transition-all duration-300 sm:w-8",
                step < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="size-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Password input with toggle ───────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-9 pr-9"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

// ─── Step 1: Account info ─────────────────────────────────────────────────────

function StepAccount({
  data,
  onChange,
  onNext,
  errors,
}: {
  data: { email: string; password: string; confirmPassword: string }
  onChange: (field: string, value: string) => void
  onNext: () => void
  errors: Record<string, string>
}) {
  const strength = getPasswordStrength(data.password)
  const canProed =
    data.email &&
    data.password &&
    data.confirmPassword &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Tài khoản</h2>
        <p className="text-sm text-muted-foreground">
          Thông tin đăng nhập của bạn
        </p>
      </div>

      <FormField label="Email" error={errors.email}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            className="pl-9"
            aria-invalid={!!errors.email}
          />
        </div>
      </FormField>

      <FormField label="Mật khẩu" error={errors.password}>
        <PasswordInput
          value={data.password}
          onChange={(v) => onChange("password", v)}
          placeholder="Ít nhất 8 ký tự"
          ariaLabel="Mật khẩu"
        />
        {data.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((bar) => (
                <div
                  key={`bar-${bar}`}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    bar <= strength.score ? strength.color : "bg-border"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Độ mạnh:{" "}
              <span className={cn("font-medium")}>
                {strength.label}
              </span>
            </p>
          </div>
        )}
      </FormField>

      <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword}>
        <PasswordInput
          value={data.confirmPassword}
          onChange={(v) => onChange("confirmPassword", v)}
          placeholder="Nhập lại mật khẩu"
          ariaLabel="Xác nhận mật khẩu"
        />
      </FormField>

      <Button
        onClick={onNext}
        disabled={!canProed}
        className="w-full h-11 font-semibold mt-1"
        size="lg"
      >
        Tiếp tục
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  )
}

// ─── Step 2: Personal info ───────────────────────────────────────────────────

function StepPersonal({
  data,
  onChange,
  onNext,
  onBack,
  errors,
}: {
  data: { fullName: string; studentId: string; faculty: string }
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
  errors: Record<string, string>
}) {
  const faculties = [
    "Khoa Công nghệ Thông tin",
    "Khoa Kinh tế",
    "Khoa Ngoại ngữ",
    "Khoa Kỹ thuật",
    "Khoa Luật",
    "Khoa Sư phạm",
  ]
  const canProed = data.fullName && data.studentId && data.faculty

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Thông tin cá nhân</h2>
        <p className="text-sm text-muted-foreground">
          Thông tin sinh viên của bạn
        </p>
      </div>

      <FormField label="Họ và tên" error={errors.fullName}>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={data.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            className="pl-9"
            aria-invalid={!!errors.fullName}
          />
        </div>
      </FormField>

      <FormField label="Mã sinh viên" error={errors.studentId}>
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={data.studentId}
            onChange={(e) => onChange("studentId", e.target.value)}
            placeholder="A46287"
            autoComplete="off"
            className="pl-9"
            aria-invalid={!!errors.studentId}
          />
        </div>
      </FormField>

      <FormField label="Khoa" error={errors.faculty}>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none pointer-events-none" />
          <select
            value={data.faculty}
            onChange={(e) => onChange("faculty", e.target.value)}
            className={cn(
              "w-full h-8 rounded-lg border border-input bg-transparent pl-9 pr-3 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm appearance-none cursor-pointer",
              !data.faculty && "text-muted-foreground"
            )}
            aria-label="Chọn khoa"
          >
            <option value="" disabled>
              Chọn khoa của bạn
            </option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground rotate-90 pointer-events-none" />
        </div>
      </FormField>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-11"
          size="lg"
        >
          <ChevronLeft className="size-4 mr-1" />
          Quay lại
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProed}
          className="flex-1 h-11 font-semibold"
          size="lg"
        >
          Tiếp tục
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({
  data,
  onBack,
  onSubmit,
  loading,
}: {
  data: {
    email: string
    password: string
    fullName: string
    studentId: string
    faculty: string
  }
  onBack: () => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Xác nhận đăng ký</h2>
        <p className="text-sm text-muted-foreground">
          Kiểm tra thông tin trước khi tiếp tục
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="text-muted-foreground">Họ và tên</span>
          <span className="min-w-0 break-words font-medium text-foreground sm:text-right">{data.fullName}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="text-muted-foreground">Mã sinh viên</span>
          <span className="font-medium text-foreground font-mono">
            {data.studentId}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="text-muted-foreground">Khoa</span>
          <span className="min-w-0 break-words font-medium text-foreground sm:max-w-[60%] sm:text-end">
            {data.faculty}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="text-muted-foreground">Email</span>
          <span className="min-w-0 break-all font-mono font-medium text-foreground sm:text-right">
            {data.email}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Mail className="size-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Một email xác thực sẽ được gửi đến{" "}
          <span className="font-medium text-foreground">{data.email}</span>.
          Vui lòng xác thực tài khoản trước khi đăng nhập.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1 h-11"
          size="lg"
        >
          <ChevronLeft className="size-4 mr-1" />
          Quay lại
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 h-11 font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Đang xử lý...
            </>
          ) : (
            "Đăng ký"
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({ email }: { email: string }) {
  return (
    <div className="space-y-6 text-center animate-in fade-in duration-300">
      <div className="flex justify-center">
        <div className="size-16 rounded-full bg-success-soft flex items-center justify-center">
          <Check className="size-8 text-success" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Đăng ký thành công!</h2>
        <p className="text-sm text-muted-foreground">
          Chúng tôi đã gửi email xác thực đến
        </p>
        <p className="break-all font-mono text-sm font-semibold text-foreground">
          {email}
        </p>
        <p className="text-xs text-muted-foreground">
          Nhấn vào liên kết trong email để kích hoạt tài khoản.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p>Không nhận được email?</p>
        <button
          type="button"
          className="text-primary hover:underline font-medium mt-0.5"
        >
          Gửi lại email xác thực
        </button>
      </div>

      <Button
        variant="outline"
        className="w-full h-11"
        size="lg"
        render={<Link href="/login" />}
      >
        <ChevronLeft className="size-4 mr-1" />
        Quay về đăng nhập
      </Button>
    </div>
  )
}

// ─── Main RegisterCard ───────────────────────────────────────────────────────

export function RegisterCard() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    studentId: "",
    faculty: "",
  })

  const updateRegistrationField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email không được để trống"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ"
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống"
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Họ và tên không được để trống"
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên quá ngắn"
    }

    if (formData.studentId && !/^[A-Za-z]\d{5,10}$/.test(formData.studentId.trim())) {
      newErrors.studentId = "Mã sinh viên phải có định dạng A + số (ví dụ: A46287)"
    }

    if (!formData.faculty) {
      newErrors.faculty = "Vui lòng chọn khoa"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep2 = () => {
    if (validateStep1()) setStep(2)
  }

  const handleNextStep3 = () => {
    if (validateStep2()) setStep(3)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const result = await register({
      email: formData.email,
      password: formData.password,
      displayName: formData.fullName,
      studentId: formData.studentId || undefined,
      faculty: formData.faculty || undefined,
    })
    setLoading(false)
    if (result.success) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <SuccessState email={formData.email} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-6 sm:p-8">
        {/* Tiêu đề — chỉ hiện ở step 1 */}
        {step === 1 && (
          <div className="mb-5 text-center sm:mb-6">
            <h1 className="text-2xl font-semibold mb-1.5">Tạo tài khoản mới</h1>
            <p className="text-sm text-muted-foreground">
              Tham gia cộng đồng sinh viên TLU
            </p>
          </div>
        )}

        <StepIndicator currentStep={step} totalSteps={3} />

        {step === 1 && (
          <StepAccount
            data={formData}
            onChange={updateRegistrationField}
            onNext={handleNextStep2}
            errors={errors}
          />
        )}
        {step === 2 && (
          <StepPersonal
            data={formData}
            onChange={updateRegistrationField}
            onNext={handleNextStep3}
            onBack={() => setStep(1)}
            errors={errors}
          />
        )}
        {step === 3 && (
          <StepConfirm
            data={formData}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}

        {/* Footer */}
        {step === 1 && (
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline underline-offset-4 font-medium"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RegisterCardSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
