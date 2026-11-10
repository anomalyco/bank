// Builds the suggested coin emoji packs in public/emoji/<pack> from the source art in art/<pack>.
// Slack custom emoji must be at most 128px and 128KB. Run with `bun scripts/emoji.ts`.
import sharp from "sharp"
import { mkdirSync, statSync } from "node:fs"

const packs = ["anomaly"]

for (const pack of packs) {
  mkdirSync(`public/emoji/${pack}`, { recursive: true })
  for (const value of [1, 5, 10, 20]) {
    const output = `public/emoji/${pack}/coin-${value}.png`
    await sharp(`art/${pack}/coin-${value}.png`)
      .trim()
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(output)
    console.log(output, statSync(output).size)
  }
}
