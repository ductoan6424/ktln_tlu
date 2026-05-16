---
name: Email SMTP
description: Gửi email với Nodemailer + Gmail SMTP trong UniConnect
---

# Email SMTP

## 1. Setup

### Environment Variables

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"  # App Password từ Google
SMTP_FROM="TLU Community <noreply@tlu.edu.vn>"
```

### Lấy Gmail App Password

1. Vào [Google Account](https://myaccount.google.com) → Security
2. Bật **2-Step Verification** (bắt buộc)
3. Vào **App passwords**
4. Tạo app password mới (chọn "Mail" và "Other (Custom name)" → đặt tên "UniConnect")
5. Copy password 16 ký tự, dùng làm `SMTP_PASS`

## 2. Email Client

```typescript
// src/lib/email/client.ts
import nodemailer from "nodemailer"

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for port 465, false for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const globalForMailer = globalThis as unknown as {
  transporter: nodemailer.Transporter | undefined
}

export const transporter =
  globalForMailer.transporter ?? createTransporter()

if (process.env.NODE_ENV !== "production") {
  globalForMailer.transporter = transporter
}
```

## 3. Email Templates

```typescript
// src/lib/email/templates.ts

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

function wrapTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1d4ed8; color: white; padding: 20px; text-align: center; }
        .content { padding: 24px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #1d4ed8; color: white; text-decoration: none; border-radius: 8px; }
        .footer { padding: 16px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="content">${content}</div>
      <div class="footer">TLU Community — Đại học Thủy Lợi</div>
    </body>
    </html>
  `
}

export function emailVerificationTemplate(
  name: string,
  verifyUrl: string
): EmailTemplate {
  return {
    subject: "Xác minh email — TLU Community",
    html: wrapTemplate(`
      <h2>Xin chào, ${name}!</h2>
      <p>Cảm ơn bạn đã đăng ký TLU Community. Vui lòng nhấn nút bên dưới để xác minh email:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" class="button">Xác minh email</a>
      </p>
      <p>Link có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
    `),
    text: `Xin chào ${name}! Truy cập ${verifyUrl} để xác minh email. Link có hiệu lực trong 24 giờ.`,
  }
}

export function passwordResetTemplate(name: string, resetUrl: string): EmailTemplate {
  return {
    subject: "Đặt lại mật khẩu — TLU Community",
    html: wrapTemplate(`
      <h2>Xin chào, ${name}!</h2>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
      </p>
      <p>Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    `),
    text: `Xin chào ${name}! Truy cập ${resetUrl} để đặt lại mật khẩu. Link có hiệu lực trong 1 giờ.`,
  }
}

export function notificationTemplate(
  name: string,
  title: string,
  message: string,
  link: string
): EmailTemplate {
  return {
    subject: `[TLU Community] ${title}`,
    html: wrapTemplate(`
      <h2>Xin chào, ${name}!</h2>
      <p><strong>${title}</strong></p>
      <p>${message}</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" class="button">Xem chi tiết</a>
      </p>
    `),
    text: `TLU Community: ${title}. ${message}. Xem chi tiết: ${link}`,
  }
}
```

## 4. Email Sender

```typescript
// src/lib/email/sender.ts
import { transporter } from "@/lib/email/client"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = process.env.SMTP_FROM ?? "TLU Community <noreply@tlu.edu.vn>"

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

// Wrapper cho từng loại email
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  const template = emailVerificationTemplate(name, verifyUrl)
  await sendEmail({ to, ...template })
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  const template = passwordResetTemplate(name, resetUrl)
  await sendEmail({ to, ...template })
}
```

## 5. Sử dụng trong Server Actions

```typescript
// src/actions/auth.ts
"use server"

import { prisma } from "@/lib/prisma/client"
import { sendVerificationEmail } from "@/lib/email/sender"
import { successResult, errorResult } from "@/types/api"
import { randomBytes } from "crypto"

export async function register(input: unknown) {
  // ... validate, create Supabase Auth user ...

  // Tạo token xác minh
  const token = randomBytes(32).toString("hex")

  await prisma.emailVerification.create({
    data: {
      userId: authData.user!.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  })

  // Gửi email
  await sendVerificationEmail(
    validated.data.email,
    validated.data.displayName,
    token
  )

  return successResult({ message: "Đã gửi email xác minh" })
}
```

```typescript
// src/actions/auth.ts — reset password
export async function requestPasswordReset(email: string) {
  const user = await prisma.userProfile.findUnique({ where: { email } })
  if (!user) {
    // Vẫn return success để tránh email enumeration
    return successResult({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn" })
  }

  const token = randomBytes(32).toString("hex")
  await prisma.passwordReset.create({
    data: {
      userId: user.userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  })

  await sendPasswordResetEmail(email, user.displayName, token)
  return successResult({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn" })
}
```

## 6. Lưu ý

- **Không expose technical errors** — nếu gửi email fail, vẫn return success cho user (log lỗi phía server)
- **Email enumeration protection** — khi request password reset, luôn return cùng message dù email có tồn tại hay không
- **Token storage** — lưu verification/reset tokens trong Prisma, KHÔNG gửi token qua URL params không mã hoá
- **Token expiry** — verify token có hết hạn chưa trước khi accept
- **One-time use** — xoá token sau khi sử dụng