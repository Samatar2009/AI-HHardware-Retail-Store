// One-off generator for public/icons/*.png — run with: node scripts/generate-pwa-icons.js
// No store logo asset exists in the repo yet, so this renders a simple
// orange-branded "BH" monogram (brand colours from Guidelines doc Section 2)
// as a stand-in icon set until a real logo is supplied.
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ORANGE = '#F97316'
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(OUT_DIR, { recursive: true })

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

function iconSvg(size, { maskable = false } = {}) {
  // Maskable icons need content inside the ~80% "safe zone" circle so
  // adaptive-icon masks (circle, squircle, etc.) don't clip the monogram.
  const fontSize = maskable ? size * 0.34 : size * 0.42
  const corner = maskable ? 0 : size * 0.18
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${corner}" fill="${ORANGE}" />
  <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif" font-weight="700"
    font-size="${fontSize}" fill="#FFFFFF">BH</text>
</svg>`
}

async function run() {
  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`)
    await sharp(Buffer.from(iconSvg(size))).png().toFile(outPath)
    console.log('wrote', outPath)
  }

  for (const size of [192, 512]) {
    const outPath = path.join(OUT_DIR, `icon-maskable-${size}x${size}.png`)
    await sharp(Buffer.from(iconSvg(size, { maskable: true }))).png().toFile(outPath)
    console.log('wrote', outPath)
  }

  // apple-touch-icon: no transparency, no rounded corners (iOS applies its own mask)
  const appleSvg = iconSvg(180, { maskable: true }).replace(` rx="0"`, ' rx="0"')
  await sharp(Buffer.from(appleSvg)).flatten({ background: ORANGE }).png().toFile(
    path.join(OUT_DIR, 'apple-touch-icon.png')
  )
  console.log('wrote', path.join(OUT_DIR, 'apple-touch-icon.png'))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
