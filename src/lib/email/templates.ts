// src/lib/email/templates.ts

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

function wrapTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1d4ed8; color: white; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 24px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 24px; background: #1d4ed8; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
    .footer { padding: 16px; text-align: center; color: #6b7280; font-size: 12px; }
    .notice { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;font-size:20px;">${title}</h1>
  </div>
  <div class="content">${content}</div>
  <div class="footer">TLU Community — Đại học Thủy Lợi</div>
</body>
</html>`
}

export function emailVerificationTemplate(
  name: string,
  verifyUrl: string
): EmailTemplate {
  return {
    subject: "Xác minh email — TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${name}!</h2>
      <p>Cảm ơn bạn đã đăng ký TLU Community. Vui lòng nhấn nút bên dưới để xác minh email:</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${verifyUrl}" class="button">Xác minh email</a>
      </p>
      <div class="notice">Liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.</div>
    `),
    text: `Xin chao ${name}! Truy cap ${verifyUrl} de xac minh email. Link co hieu luc trong 24 gio.`,
  }
}

export function passwordResetTemplate(
  name: string,
  resetUrl: string
): EmailTemplate {
  return {
    subject: "Đặt lại mật khẩu — TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${name}!</h2>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
      </p>
      <div class="notice">Liên kết có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</div>
    `),
    text: `Xin chao ${name}! Truy cap ${resetUrl} de dat lai mat khau. Link co hieu luc trong 1 gio.`,
  }
}
