// Renders the default coin emoji pack into public/emoji. Run with `bun scripts/emoji.ts`.
import { Resvg } from "@resvg/resvg-js"
import { mkdirSync, writeFileSync } from "node:fs"

const tiers = [
  { value: 1, light: "#f2b48a", base: "#c9733f", dark: "#8a4520", ink: "#5c2c12" },
  { value: 5, light: "#f4f6f8", base: "#b9c2cc", dark: "#7b8794", ink: "#3b4450" },
  { value: 10, light: "#ffe58a", base: "#f2b824", dark: "#b37a0a", ink: "#6b4400" },
  { value: 20, light: "#d9c8ff", base: "#9b7bf0", dark: "#5c3fbf", ink: "#2e1a73" },
]

function svg(tier: (typeof tiers)[number]) {
  const text = String(tier.value)
  const size = text.length > 1 ? 50 : 60
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tier.light}"/>
      <stop offset="0.55" stop-color="${tier.base}"/>
      <stop offset="1" stop-color="${tier.dark}"/>
    </linearGradient>
    <linearGradient id="rim" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${tier.light}"/>
      <stop offset="1" stop-color="${tier.dark}"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="68" r="58" fill="${tier.dark}"/>
  <circle cx="64" cy="62" r="58" fill="url(#face)"/>
  <circle cx="64" cy="62" r="46" fill="url(#rim)"/>
  <circle cx="64" cy="62" r="42" fill="url(#face)"/>
  <path d="M28 40 A46 46 0 0 1 64 16" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6" stroke-linecap="round" fill="none"/>
  <text x="64" y="63" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="800" font-size="${size}" fill="${tier.ink}" fill-opacity="0.9">${text}</text>
</svg>`
}

mkdirSync("public/emoji", { recursive: true })
for (const tier of tiers) {
  const png = new Resvg(svg(tier), {
    font: { fontFiles: ["node_modules/@opencode/ui/src/assets/fonts/Inter.ttf"], loadSystemFonts: false, defaultFontFamily: "Inter" },
  })
    .render()
    .asPng()
  writeFileSync(`public/emoji/coin-${tier.value}.png`, png)
  console.log(`public/emoji/coin-${tier.value}.png`, png.length)
}
