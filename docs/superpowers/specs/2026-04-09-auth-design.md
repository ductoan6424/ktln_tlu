# Auth + Email Service Design — UniConnect Phase 1

> **Ngày:** 2026-04-09
> **Phạm vi:** Auth flows (đăng nhập, đăng ký, quên mật khẩu) + Email service
> **Trạng thái:** Approved

---

## 1. Mục tiêu

Implement hệ thống xác thực hoàn chỉnh: đăng ký, đăng nhập, đăng xuất, xác minh email, quên mật khẩu, đặt lại mật khẩu. Email service dùng Nodemailer + Gmail SMTP.

---

## 2. Cấu trúc files

```
src/
├── actions/
│   └── auth.ts              # Tất cả auth Server Actions
├── lib/
│   ├── email/
│   │   ├── client.ts        # Nodemailer transporter (đã có scaffold)
│   │   ├── sender.ts        # Hàm gửi email
│   │   └── templates.ts     # HTML email templates (đã có scaffold)
│   ├── auth/
│   │   └── permissions.ts  # requireAuth, getCurrentUser
│   └── errors.ts            # AppError classes (đã có)
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts  # Supabase auth callback
│   ├── (auth)/
│   │   ├── login/page.tsx   # Đã có UI, kết nối action
│   │   ├── register/page.tsx # Đã có UI, kết nối action
│   │   └── forgot-password/
│   │       └── page.tsx     # Đã có UI, kết nối action
│   ├── verify-email/
│   │   └── page.tsx         # MỚI: trang xác minh email
│   └── reset-password/
│       └── page.tsx         # MỚI: trang đặt lại mật khẩu
└── middleware.ts             # Bảo vệ routes
```

---

## 3. Tech Stack

- **Supabase Auth** — xác thực, session, JWT
- **Prisma + Neon** — lưu UserProfile, EmailVerification, PasswordReset
- **Nodemailer + Gmail SMTP** — gửi email
- **Server Actions** — logic phía server, `"use server"`

---

## 4. Enums

```typescript
// src/lib/auth/types.ts
export const USER_ROLES = {
  STUDENT: "STUDENT",
  LECTURER: "LECTURER",
  CLUB_ADMIN: "CLUB_ADMIN",
  ADMIN: "ADMIN",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
```

Role mặc định khi đăng ký: `STUDENT`. Hệ thống phân quyền chi tiết sẽ implement sau.

---

## 5. Action: register

```typescript
// src/actions/auth.ts
export async function register(input: RegisterInput): Promise<ActionResult>
```

**Input:**
```typescript
const registerSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(8),
  displayName: z.string().min(2).max(100),
  studentId: z.string().optional(),
  faculty: z.string().optional(),
})
```

**Flow:**
1. Validate input bằng Zod
2. Kiểm tra email đã tồn tại trong Prisma UserProfile chưa
3. Gọi `supabase.auth.signUp({ email, password })`
4. Tạo `UserProfile` trong Prisma với role mặc định `STUDENT`
5. Tạo `EmailVerification` token (24h expiry)
6. Gửi email xác minh qua Nodemailer
7. Return `{ success: true }`

**Errors:**
- Email đã tồn tại → "Email đã được đăng ký"
- Supabase error → "Không thể tạo tài khoản. Vui lòng thử lại."

---

## 6. Action: verifyEmail

```typescript
export async function verifyEmail(token: string): Promise<ActionResult>
```

**Flow:**
1. Tìm `EmailVerification` record với token
2. Kiểm tra chưa hết hạn
3. Cập nhật Supabase Auth user metadata `{ email_verified: true }`
4. Xoá `EmailVerification` record (one-time use)
5. Return `{ success: true }`

---

## 7. Action: resendVerification

```typescript
export async function resendVerification(email: string): Promise<ActionResult>
```

**Flow:**
1. Tìm UserProfile bằng email
2. Xoá EmailVerification cũ nếu có
3. Tạo token mới + gửi email
4. Return `{ success: true }` (luôn, kể cả email không tồn tại — enumeration protection)

---

## 8. Action: login

```typescript
export async function login(email: string, password: string): Promise<ActionResult>
```

**Flow:**
1. Gọi `supabase.auth.signInWithPassword({ email, password })`
2. Kiểm tra Supabase trả về session không lỗi
3. Set session cookies (Supabase SSR tự xử lý)
4. Return `{ success: true }`

**Errors:**
- Invalid credentials → "Email hoặc mật khẩu không đúng"
- Email chưa verify → "Vui lòng xác minh email trước"

---

## 9. Action: logout

```typescript
export async function logout(): Promise<void>
```

**Flow:**
1. Gọi `supabase.auth.signOut()`
2. Redirect về `/login`

---

## 10. Action: forgotPassword

```typescript
export async function forgotPassword(email: string): Promise<ActionResult>
```

**Flow:**
1. Tìm UserProfile bằng email
2. Xoá PasswordReset cũ nếu có
3. Tạo `PasswordReset` token (1h expiry)
4. Gửi email reset
5. Return `{ success: true, message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn" }` — luôn same message (enumeration protection)

---

## 11. Action: resetPassword

```typescript
export async function resetPassword(token: string, newPassword: string): Promise<ActionResult>
```

**Flow:**
1. Tìm `PasswordReset` record với token
2. Kiểm tra chưa hết hạn
3. Gọi `supabase.auth.admin.updateUserById()` để đổi password
4. Xoá `PasswordReset` record (one-time use)
5. Return `{ success: true }`

---

## 12. Auth Helpers

```typescript
// src/lib/auth/permissions.ts

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError("Vui lòng đăng nhập")
  return user
}

export async function getCurrentUserProfile() {
  const user = await requireAuth()
  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id }
  })
  if (!profile) throw new NotFoundError("Không tìm thấy hồ sơ người dùng")
  return profile
}
```

---

## 13. Middleware

```typescript
// src/middleware.ts

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/verify-email", "/reset-password"]
const AUTH_ROUTES = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes → cho qua
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Auth routes → đã login thì redirect feed
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const user = await getCurrentUser()
    if (user) return NextResponse.redirect(new URL("/feed", request.url))
    return NextResponse.next()
  }

  // Protected routes → chưa login → redirect login
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}
```

---

## 14. Email Templates

```typescript
// src/lib/email/templates.ts (đã scaffold sẵn, chỉ cần gọi)

export function emailVerificationTemplate(name: string, verifyUrl: string): EmailTemplate
export function passwordResetTemplate(name: string, resetUrl: string): EmailTemplate
export function notificationTemplate(title: string, message: string, link: string): EmailTemplate
```

---

## 15. UI Pages — thay đổi

### login/page.tsx
- Kết nối `LoginCard` với `loginAction`
- Hiển thị error message từ action
- Redirect `/feed` khi success

### register/page.tsx
- Kết nối `RegisterCard` với `registerAction`
- Hiển thị error message từ action
- Hiển thị success state khi registered

### forgot-password/page.tsx
- Kết nối `ForgotPasswordCard` với `forgotPasswordAction`

### verify-email/page.tsx (MỚI)
- Đọc `token` từ URL search params
- Gọi `verifyEmailAction(token)`
- Hiển thị success/error state
- Link đến `/login`

### reset-password/page.tsx (MỚI)
- Đọc `token` từ URL search params
- Form nhập password mới + confirm
- Gọi `resetPasswordAction(token, password)`
- Redirect `/login` khi success

---

## 16. ActionResult pattern

```typescript
// src/types/api.ts
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}
```

---

## 17. Error handling

- Supabase errors → map sang user-friendly message tiếng Việt
- Prisma errors → catch, return generic error, log chi tiết phía server
- Token hết hạn → "Liên kết đã hết hạn. Vui lòng yêu cầu mới."
- Token không tồn tại → "Liên kết không hợp lệ."
