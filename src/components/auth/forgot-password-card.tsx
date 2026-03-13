"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type OtpStep = "request-otp" | "verify-otp" | "reset-password"

export function ForgotPasswordCard() {
    const router = useRouter()
    const [step, setStep] = useState<OtpStep>("request-otp")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmNewPassword, setConfirmNewPassword] = useState("")

    const handleRequestOtp = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setOtp("")
        setNewPassword("")
        setConfirmNewPassword("")
        setStep("verify-otp")
    }

    const handleVerifyOtp = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStep("reset-password")
    }

    const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        window.alert("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.")
        router.push("/login")
    }

    return (
        <Card className="shadow-2xl shadow-foreground/5 border">
            <CardContent className="p-8 lg:p-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">Quên mật khẩu</h1>
                    <p className="text-muted-foreground text-sm">
                        {step === "request-otp"
                            ? "Nhập email để nhận mã OTP"
                            : step === "verify-otp"
                                ? "Nhập OTP để xác thực"
                                : "Tạo mật khẩu mới"}
                    </p>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <div
                        className={[
                            "h-1 flex-1 rounded-full",
                            step === "request-otp" ? "bg-primary" : "bg-primary/40",
                        ].join(" ")}
                    />
                    <div
                        className={[
                            "h-1 flex-1 rounded-full",
                            step === "verify-otp" ? "bg-primary" : step === "reset-password" ? "bg-primary/40" : "bg-border",
                        ].join(" ")}
                    />
                    <div
                        className={[
                            "h-1 flex-1 rounded-full",
                            step === "reset-password" ? "bg-primary" : "bg-border",
                        ].join(" ")}
                    />
                </div>

                {step === "request-otp" ? (
                    <form className="space-y-4" onSubmit={handleRequestOtp}>
                        <Input
                            type="email"
                            name="email"
                            placeholder="Email đã đăng ký"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />

                        <Button type="submit" size="lg" className="w-full">
                            Gửi OTP
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            Đã nhớ mật khẩu?{" "}
                            <Link
                                href="/login"
                                className="text-primary font-medium hover:underline underline-offset-4"
                            >
                                Quay lại đăng nhập
                            </Link>
                        </p>
                    </form>
                ) : step === "verify-otp" ? (
                    <form className="space-y-4" onSubmit={handleVerifyOtp}>
                        <Input type="email" name="email" value={email} readOnly />
                        <Input
                            type="text"
                            name="otp"
                            placeholder="Nhập mã OTP"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value)}
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            required
                        />

                        <Button type="submit" size="lg" className="w-full">
                            Xác thực OTP
                        </Button>

                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={() => setStep("request-otp")}
                                className="text-primary hover:underline underline-offset-4"
                            >
                                Đổi email
                            </button>
                            <button
                                type="button"
                                className="text-primary hover:underline underline-offset-4"
                            >
                                Gửi lại OTP
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="space-y-4" onSubmit={handleResetPassword}>
                        <Input type="email" name="email" value={email} readOnly />
                        <Input
                            type="password"
                            name="newPassword"
                            placeholder="Mật khẩu mới"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <Input
                            type="password"
                            name="confirmNewPassword"
                            placeholder="Xác nhận mật khẩu mới"
                            value={confirmNewPassword}
                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                        />

                        <Button type="submit" size="lg" className="w-full">
                            Đặt lại mật khẩu
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}
