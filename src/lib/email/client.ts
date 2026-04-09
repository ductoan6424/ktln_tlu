// src/lib/email/client.ts
import nodemailer from "nodemailer"

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
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
