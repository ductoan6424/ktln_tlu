// Script sinh icons PWA từ public/logo.svg.
// Chạy: node scripts/generate-pwa-icons.mjs (hoặc npm run pwa:icons)
import { readFile, mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const SRC = resolve(ROOT, "public", "logo.svg")
const OUT_DIR = resolve(ROOT, "public", "icons")

// Màu nền brand (phù hợp theme_color sẽ khai báo trong manifest).
const BG = "#ffffff"
const BG_MASKABLE = "#1d4ed8" // blue-700 cho maskable để icon nổi bật trên mọi platform

const SIZES = [
  { name: "icon-192.png", size: 192, bg: BG, pad: 0.1 },
  { name: "icon-256.png", size: 256, bg: BG, pad: 0.1 },
  { name: "icon-384.png", size: 384, bg: BG, pad: 0.1 },
  { name: "icon-512.png", size: 512, bg: BG, pad: 0.1 },
  { name: "icon-maskable-512.png", size: 512, bg: BG_MASKABLE, pad: 0.2 },
  { name: "apple-touch-icon.png", size: 180, bg: BG, pad: 0.08 },
  { name: "favicon-32.png", size: 32, bg: BG, pad: 0.05 },
  { name: "badge-72.png", size: 72, bg: BG, pad: 0.15 },
]

async function main() {
  if (!existsSync(SRC)) {
    throw new Error(`Không tìm thấy logo nguồn: ${SRC}`)
  }
  await mkdir(OUT_DIR, { recursive: true })
  const svg = await readFile(SRC)

  for (const { name, size, bg, pad } of SIZES) {
    const inner = Math.round(size * (1 - pad * 2))
    const rendered = await sharp(svg, { density: 512 })
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const out = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bg,
      },
    })
      .composite([{ input: rendered, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toBuffer()

    await writeFile(resolve(OUT_DIR, name), out)
    console.log(`✓ ${name} (${size}x${size})`)
  }
  console.log(`\nXong. Icons lưu tại: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
