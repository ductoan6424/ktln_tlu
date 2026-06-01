import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { TextDecoder } from "node:util"

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".mts",
  ".prisma",
  ".ts",
  ".tsx",
  ".txt",
])

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".codex-backups",
  "coverage",
  "node_modules",
  "src/generated",
])

const MOJIBAKE_FRAGMENTS = [
  "\u00c3",
  "\u00c4",
  "\u00c6",
  "\u00e1\u00ba",
  "\u00e1\u00bb",
]

const VIETNAMESE_DIACRITIC_PATTERN = new RegExp(
  "[\\u00c0\\u00c1\\u00c2\\u00c3\\u00c8\\u00c9\\u00ca\\u00cc\\u00cd\\u00d2\\u00d3\\u00d4\\u00d5\\u00d9\\u00da\\u0102\\u0110\\u0128\\u0168\\u01a0\\u01af\\u00e0\\u00e1\\u00e2\\u00e3\\u00e8\\u00e9\\u00ea\\u00ec\\u00ed\\u00f2\\u00f3\\u00f4\\u00f5\\u00f9\\u00fa\\u0103\\u0111\\u0129\\u0169\\u01a1\\u01b0\\u1ea0-\\u1ef9]",
)

const ASCII_VIETNAMESE_WORD_PATTERN =
  /\b(?:ban|bao|bai|binh|can|cap|chao|chinh|cho|co|cong|cua|dang|dao|den|diem|dieu|dung|duoc|hoc|khong|khoa|lop|ma|mat|moi|nguoi|nhap|noi|quan|sinh|tai|ten|thanh|the|them|thong|tieng|trang|truong|viet|xem|xin)\b/gi

function isIgnored(relativePath) {
  return relativePath
    .split(path.sep)
    .some((segment, index, parts) => {
      const candidate = parts.slice(0, index + 1).join(path.sep)
      return IGNORED_DIRS.has(segment) || IGNORED_DIRS.has(candidate)
    })
}

function getLineColumn(text, offset) {
  const before = text.slice(0, offset)
  const lines = before.split(/\r\n|\r|\n/)
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  }
}

function pushIssue(issues, code, message, severity, text, offset = 0) {
  issues.push({
    code,
    message,
    severity,
    ...getLineColumn(text, offset),
  })
}

export function analyzeTextFile(relativePath, buffer) {
  const issues = []
  const lossyText = buffer.toString("utf8")

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    pushIssue(issues, "utf8-bom", "File starts with UTF-8 BOM", "warning", lossyText)
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer)
  } catch {
    pushIssue(issues, "invalid-utf8", "File is not valid UTF-8", "error", lossyText)
  }

  const replacementIndex = lossyText.indexOf("\uFFFD")
  if (replacementIndex !== -1) {
    pushIssue(
      issues,
      "replacement-character",
      "File contains Unicode replacement character",
      "error",
      lossyText,
      replacementIndex,
    )
  }

  const controlMatch = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.exec(lossyText)
  if (controlMatch?.index !== undefined) {
    pushIssue(
      issues,
      "control-character",
      "File contains an unexpected control character",
      "warning",
      lossyText,
      controlMatch.index,
    )
  }

  const mojibake = MOJIBAKE_FRAGMENTS.find((fragment) => lossyText.includes(fragment))
  if (mojibake) {
    pushIssue(
      issues,
      "mojibake-fragment",
      "File contains a common UTF-8 mojibake fragment",
      "error",
      lossyText,
      lossyText.indexOf(mojibake),
    )
  }

  return {
    relativePath,
    issues,
    vietnamese: {
      withDiacritics: (lossyText.match(VIETNAMESE_DIACRITIC_PATTERN) ?? []).length,
      asciiCandidates: (lossyText.match(ASCII_VIETNAMESE_WORD_PATTERN) ?? []).length,
    },
  }
}

export function listTextFiles(root, base = root) {
  const files = []

  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry)
    const relativePath = path.relative(base, fullPath)

    if (isIgnored(relativePath)) {
      continue
    }

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...listTextFiles(fullPath, base))
      continue
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath)
    }
  }

  return files
}

export function analyzeRepository(root = process.cwd()) {
  return listTextFiles(root).map((filePath) => {
    const relativePath = path.relative(root, filePath)
    return analyzeTextFile(relativePath, readFileSync(filePath))
  })
}

function printReport(results) {
  const allIssues = results.flatMap((result) =>
    result.issues.map((issue) => ({
      ...issue,
      relativePath: result.relativePath,
    })),
  )
  const totals = results.reduce(
    (sum, result) => ({
      asciiCandidates: sum.asciiCandidates + result.vietnamese.asciiCandidates,
      withDiacritics: sum.withDiacritics + result.vietnamese.withDiacritics,
    }),
    { asciiCandidates: 0, withDiacritics: 0 },
  )

  if (allIssues.length === 0) {
    console.log("Vietnamese/encoding check: no blocking encoding issues found.")
  } else {
    console.error("Vietnamese/encoding check found issues:")
    for (const issue of allIssues) {
      console.error(
        `- ${issue.relativePath}:${issue.line}:${issue.column} [${issue.severity}] ${issue.code}: ${issue.message}`,
      )
    }
  }

  console.log(
    `Vietnamese text signals: ${totals.withDiacritics} accented characters, ${totals.asciiCandidates} unaccented Vietnamese-word candidates.`,
  )
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
  const results = analyzeRepository(root)
  const hasErrors = results.some((result) =>
    result.issues.some((issue) => issue.severity === "error"),
  )

  printReport(results)
  process.exitCode = hasErrors ? 1 : 0
}

const currentFilePath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  main()
}
