// Builds the default coin emoji pack in public/emoji from the source art in art/coins.
// Slack custom emoji must be at most 128px and 128KB. Run with `bun scripts/emoji.ts`.
import sharp from "sharp"
import { mkdirSync, statSync } from "node:fs"

mkdirSync("public/emoji", { recursive: true })
for (const value of [1, 5, 10, 20]) {
  const output = `public/emoji/coin-${value}.png`
  await sharp(`art/coins/coin-${value}.png`)
    .trim()
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(output)
  console.log(output, statSync(output).size)
}
