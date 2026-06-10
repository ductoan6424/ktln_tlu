import { NextRequest, NextResponse } from "next/server"

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

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => {
    return (
      cookie.name === "supabase-auth-token" ||
      cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
    )
  })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const PUBLIC_FILE_EXTENSIONS = [
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".js",
    ".json",
    ".webmanifest",
    ".map",
  ]
  if (PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next()
  }

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (hasSupabaseAuthCookie(request)) {
      return NextResponse.redirect(new URL("/feed", request.url))
    }
    return NextResponse.next()
  }

  if (!hasSupabaseAuthCookie(request)) {
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
