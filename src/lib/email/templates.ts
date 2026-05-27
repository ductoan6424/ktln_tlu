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
    <h1 style="margin:0;font-size:20px;">${escapeHtml(title)}</h1>
  </div>
  <div class="content">${content}</div>
  <div class="footer">TLU Community - Đại học Thăng Long</div>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function emailVerificationTemplate(
  name: string,
  verifyUrl: string
): EmailTemplate {
  const safeName = escapeHtml(name)
  const safeVerifyUrl = escapeHtml(verifyUrl)

  return {
    subject: "Xác minh email - TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${safeName}!</h2>
      <p>Cảm ơn bạn đã đăng ký TLU Community. Vui lòng nhấn nút bên dưới để xác minh email:</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${safeVerifyUrl}" class="button">Xác minh email</a>
      </p>
      <div class="notice">Liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.</div>
    `),
    text: `Xin chào ${name}! Truy cập ${verifyUrl} để xác minh email. Liên kết có hiệu lực trong 24 giờ.`,
  }
}

export function passwordResetTemplate(
  name: string,
  resetUrl: string
): EmailTemplate {
  const safeName = escapeHtml(name)
  const safeResetUrl = escapeHtml(resetUrl)

  return {
    subject: "Đặt lại mật khẩu - TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${safeName}!</h2>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${safeResetUrl}" class="button">Đặt lại mật khẩu</a>
      </p>
      <div class="notice">Liên kết có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</div>
    `),
    text: `Xin chào ${name}! Truy cập ${resetUrl} để đặt lại mật khẩu. Liên kết có hiệu lực trong 1 giờ.`,
  }
}

export function contactEmailVerificationTemplate(
  name: string,
  verifyUrl: string
): EmailTemplate {
  const safeName = escapeHtml(name)
  const safeVerifyUrl = escapeHtml(verifyUrl)

  return {
    subject: "Xác thực email liên hệ - TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${safeName}!</h2>
      <p>Vui lòng nhấn nút bên dưới để xác thực email liên hệ cho tài khoản TLU Community của bạn:</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${safeVerifyUrl}" class="button">Xác thực email liên hệ</a>
      </p>
      <div class="notice">Liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</div>
    `),
    text: `Xin chào ${name}! Truy cập ${verifyUrl} để xác thực email liên hệ. Liên kết có hiệu lực trong 24 giờ.`,
  }
}

export function contactEmailVerifiedTemplate(name: string): EmailTemplate {
  const safeName = escapeHtml(name)

  return {
    subject: "Email liên hệ đã được xác thực - TLU Community",
    html: wrapTemplate("TLU Community", `
      <h2 style="margin-top:0;">Xin chào, ${safeName}!</h2>
      <p>Email liên hệ của bạn đã được xác thực thành công. Từ bây giờ email này sẽ được dùng cho thông báo và khôi phục mật khẩu.</p>
    `),
    text: `Xin chào ${name}! Email liên hệ của bạn đã được xác thực thành công.`,
  }
}

export function announcementEmailTemplate(
  name: string,
  title: string,
  content: string,
  announcementUrl: string,
): EmailTemplate {
  const safeName = escapeHtml(name)
  const safeTitle = escapeHtml(title)
  const safeContent = escapeHtml(content)
  const safeAnnouncementUrl = escapeHtml(announcementUrl)

  return {
    subject: `${title} - Thông báo TLU`,
    html: wrapTemplate("Thông báo chính thức", `
      <h2 style="margin-top:0;">Xin chào, ${safeName}!</h2>
      <p>Đại học Thăng Long vừa gửi một thông báo mới tới bạn:</p>
      <h3 style="margin: 20px 0 8px;">${safeTitle}</h3>
      <p style="white-space:pre-wrap;line-height:1.6;">${safeContent}</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${safeAnnouncementUrl}" class="button">Xem thông báo</a>
      </p>
      <div class="notice">Email này chỉ được gửi khi quản trị viên bật tùy chọn gửi email cho thông báo.</div>
    `),
    text: `Xin chào ${name}! Đại học Thăng Long có thông báo mới: ${title}\n\n${content}\n\nXem thông báo: ${announcementUrl}`,
  }
}
