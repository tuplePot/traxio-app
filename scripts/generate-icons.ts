/**
 * Render ikon PWA dari public/icon.svg. Jalankan ulang setelah ikon diubah:
 *   bun scripts/generate-icons.ts
 */
import { readFile } from "node:fs/promises"
import sharp from "sharp"

const svg = await readFile("public/icon.svg")
const BG = "#070b14"

async function render(size: number, out: string, padding = 0) {
  const inner = Math.round(size * (1 - padding * 2))
  const icon = await sharp(svg).resize(inner, inner).png().toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: padding > 0 ? BG : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toFile(out)
  console.log(`✓ ${out}`)
}

await render(192, "public/icon-192.png")
await render(512, "public/icon-512.png")
// Maskable: launcher Android bisa memotong jadi lingkaran — isi di zona aman 80%.
await render(512, "public/icon-maskable-512.png", 0.1)
// iOS tidak mendukung transparansi pada apple-touch-icon.
await render(180, "public/apple-touch-icon.png", 0.04)

// Badge notifikasi Android: siluet putih di atas transparan.
const badge = await sharp(svg).resize(96, 96).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
})
const { data, info } = badge
for (let i = 0; i < data.length; i += 4) {
  // Ambil hanya elemen terang (lilin + garis), buang background gelap.
  const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  const alpha = lum > 60 ? 255 : 0
  data[i] = data[i + 1] = data[i + 2] = 255
  data[i + 3] = alpha
}
await sharp(data, { raw: info }).png().toFile("public/badge-96.png")
console.log("✓ public/badge-96.png")
