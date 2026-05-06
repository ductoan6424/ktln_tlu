export type ParsedUserAgent = {
  browser: string
  os: string
  label: string
}

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  // Order matters: kiểm tra trình duyệt cụ thể trước Chrome/Safari generic.
  [/Edg\//i, "Edge"],
  [/OPR\/|Opera/i, "Opera"],
  [/Vivaldi/i, "Vivaldi"],
  [/SamsungBrowser/i, "Samsung Internet"],
  [/Firefox/i, "Firefox"],
  [/CriOS/i, "Chrome (iOS)"],
  [/FxiOS/i, "Firefox (iOS)"],
  [/Chromium/i, "Chromium"],
  [/Chrome/i, "Chrome"],
  [/Safari/i, "Safari"],
]

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/Windows NT 10/i, "Windows 10/11"],
  [/Windows NT/i, "Windows"],
  [/Android/i, "Android"],
  [/iPhone|iPad|iPod/i, "iOS"],
  [/Mac OS X|Macintosh/i, "macOS"],
  [/CrOS/i, "ChromeOS"],
  [/Linux/i, "Linux"],
]

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua || ua.trim().length === 0) {
    return { browser: "Trình duyệt", os: "không xác định", label: "Thiết bị không xác định" }
  }

  const browser =
    BROWSER_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? "Trình duyệt"
  const os = OS_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? "OS không xác định"
  return { browser, os, label: `${browser} trên ${os}` }
}
