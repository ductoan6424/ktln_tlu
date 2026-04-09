// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/reset-password",
  "/support",
]
const AUTH_ROUTES = ["/login", "/register"]

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const accessToken = request.cookies.get("sb-access-token")?.value
  console.log("[middleware] accessToken:", accessToken ? "present" : "MISSING")

  if (!accessToken) return false

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`
    console.log("[middleware] verifying session at:", url)
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    })
    console.log("[middleware] session verify result:", res.status)
    return res.ok
  } catch (err) {
    console.error("[middleware] session verify error:", err)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      const isLoggedIn = await hasValidSession(request)
      if (isLoggedIn) {
        return NextResponse.redirect(new URL("/feed", request.url))
      }
    }
    return NextResponse.next()
  }

  const isLoggedIn = await hasValidSession(request)
  if (!isLoggedIn) {
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
