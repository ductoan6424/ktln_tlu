// src/lib/email/sender.ts
import { transporter } from "@/lib/email/client"
import {
  contactEmailVerificationTemplate,
  contactEmailVerifiedTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
} from "@/lib/email/templates"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from =
    process.env.SMTP_FROM ?? "TLU Community <noreply@tlu.edu.vn>"

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

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

export async function sendContactEmailVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-contact-email?token=${token}`
  const template = contactEmailVerificationTemplate(name, verifyUrl)
  await sendEmail({ to, ...template })
}

export async function sendContactEmailVerifiedEmail(
  to: string,
  name: string
): Promise<void> {
  const template = contactEmailVerifiedTemplate(name)
  await sendEmail({ to, ...template })
}
