export type EmojiValue = { name: string; amount: number }

export type Config = {
  singular: string
  plural: string
  /** Name of the workspace emoji that stands for the currency, without colons. */
  symbol: string
  starting: number
  emoji: EmojiValue[]
  notify: boolean
}

export const defaultConfig: Config = {
  singular: "coin",
  plural: "coins",
  symbol: "coin-10",
  starting: 100,
  emoji: [
    { name: "coin-1", amount: 1 },
    { name: "coin-5", amount: 5 },
    { name: "coin-10", amount: 10 },
    { name: "coin-20", amount: 20 },
  ],
  notify: true,
}

export type EntryKind = "grant" | "give" | "reaction" | "refund" | "adjust"

export type Entry = {
  id: number
  at: number
  kind: EntryKind
  from: string | null
  to: string | null
  amount: number
  note: string | null
  actor: string | null
  link: string | null
}

export type Account = {
  id: string
  name: string
  image: string | null
  balance: number
  received: number
  given: number
}

export type Me = {
  user: { id: string; name: string; image: string | null }
  team: { id: string; name: string; domain: string | null; icon: string | null }
  admin: boolean
  installed: boolean
  account: Account | null
  config: Config
  /** Image URLs for the workspace's custom emoji used by the config (the symbol and the reactions). */
  emoji: Record<string, string>
}

export const EMOJI_NAME = /^[a-z0-9_\-+'.]+$/

export type Leaderboard = { accounts: Account[] }

export type History = { entries: Entry[]; people: Record<string, { name: string; image: string | null }> }

export type Admin = { id: string; name: string; image: string | null; source: "installer" | "added" | "slack" }

export type CustomEmoji = { name: string; url: string }

export function currency(config: Config, amount: number) {
  return `${amount} ${Math.abs(amount) === 1 ? config.singular : config.plural}`
}
