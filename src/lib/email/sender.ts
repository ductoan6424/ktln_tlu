// src/lib/email/sender.ts
import { transporter } from "@/lib/email/client"
import {
  contactEmailVerificationTemplate,
  contactEmailVerifiedTemplate,
  announcementEmailTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
} from "@/lib/email/templates"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

function extractEmailAddress(value: string | undefined): string | null {
  if (!value) return null
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
}

function getEmailDomain(value: string | null): string | null {
  return value?.split("@")[1]?.toLowerCase() ?? null
}

function resolveFromAddress(): string {
  const smtpHost = process.env.SMTP_HOST?.toLowerCase() ?? ""
  const smtpUser = extractEmailAddress(process.env.SMTP_USER)
  const configuredFrom = process.env.SMTP_FROM
  const configuredFromAddress = extractEmailAddress(configuredFrom)

  const smtpUserDomain = getEmailDomain(smtpUser)
  const configuredFromDomain = getEmailDomain(configuredFromAddress)
  const isGmailSmtp = smtpHost.includes("gmail.com")

  if (
    isGmailSmtp &&
    smtpUser &&
    configuredFromDomain &&
    smtpUserDomain !== configuredFromDomain
  ) {
    return `TLU Community <${smtpUser}>`
  }

  if (configuredFrom) {
    return configuredFrom
  }

  if (smtpUser) {
    return `TLU Community <${smtpUser}>`
  }

  return "TLU Community <noreply@tlu.edu.vn>"
}

async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: resolveFromAddress(),
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

export async function sendAnnouncementEmail(
  to: string,
  name: string,
  title: string,
  content: string,
  announcementPath: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const announcementUrl = new URL(announcementPath, appUrl).toString()
  const template = announcementEmailTemplate(name, title, content, announcementUrl)
  await sendEmail({ to, ...template })
}
