// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/complete-contact-email",
  "/verify-contact-email",
  "/account-inactive",
  "/reset-password",
  "/support",
]
const AUTH_ROUTES = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const PUBLIC_FILE_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"]
  if (PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next()
  }

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(new URL("/feed", request.url))
    }
    return NextResponse.next()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)",
  ],
}
