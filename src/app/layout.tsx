import type { Metadata, Viewport } from "next"
import { Be_Vietnam_Pro } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import { InstallPrompt } from "@/components/pwa/install-prompt"

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
})

const APP_NAME = "TLU Community"
const APP_DESCRIPTION = "Cổng thông tin sinh viên Đại học Thăng Long"

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.className} antialiased`}>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
