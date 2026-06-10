import { beforeEach, describe, expect, it, vi } from "vitest"

const sendMail = vi.hoisted(() => vi.fn())

vi.mock("@/lib/email/client", () => ({
  transporter: {
    sendMail,
  },
}))

import { sendPasswordResetEmail } from "@/lib/email/sender"

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetAllMocks()
  process.env = { ...originalEnv }
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
})

describe("email sender", () => {
  it("uses the Gmail SMTP account as From when SMTP_FROM has a different domain", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com"
    process.env.SMTP_USER = "school.sender@gmail.com"
    process.env.SMTP_FROM = "TLU Community <noreply@tlu.edu.vn>"
    sendMail.mockResolvedValue(undefined)

    await sendPasswordResetEmail("student@example.com", "Nguyen Van A", "reset-token")

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "TLU Community <school.sender@gmail.com>",
        to: "student@example.com",
      }),
    )
  })

  it("keeps SMTP_FROM when it matches the Gmail SMTP account domain", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com"
    process.env.SMTP_USER = "school.sender@gmail.com"
    process.env.SMTP_FROM = "TLU Community <support@gmail.com>"
    sendMail.mockResolvedValue(undefined)

    await sendPasswordResetEmail("student@example.com", "Nguyen Van A", "reset-token")

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "TLU Community <support@gmail.com>",
        to: "student@example.com",
      }),
    )
  })
})
