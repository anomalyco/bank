import { Avatar } from "@opencode/ui/avatar"
import { Badge } from "@opencode/ui/badge"
import { Button } from "@opencode/ui/button"
import { Switch as Toggle } from "@opencode/ui/switch"
import { Tabs } from "@opencode/ui/tabs"
import { TextInput } from "@opencode/ui/text-input"
import { createMemo, createResource, createRoot, createSignal, For, type JSX, Match, Show, Switch } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { currency, type Config, type Entry, type History, type Me } from "../shared/types"
import { api, ApiError, BASE, type Person } from "./api"

export function App() {
  const [me, { refetch }] = createResource(() =>
    api.me().catch((error) => {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }),
  )
  return (
    <Switch fallback={<Centered>loading…</Centered>}>
      <Match when={me.error}>
        <Centered>
          <span class="danger">{String(me.error?.message ?? me.error)}</span>
        </Centered>
      </Match>
      <Match when={me() === null}>
        <Landing />
      </Match>
      <Match when={me() && !me()!.installed}>
        <NotInstalled me={me()!} />
      </Match>
      <Match when={me()}>{(value) => <Dashboard me={value()} refresh={refetch} />}</Match>
    </Switch>
  )
}

function Centered(props: { children: JSX.Element }) {
  return <div class="min-h-screen flex items-center justify-center muted">{props.children}</div>
}

function Coin(props: { size?: number }) {
  return <img src={`${BASE}/emoji/coin-1.png`} alt="" width={props.size ?? 20} height={props.size ?? 20} />
}

function ButtonLink(props: { href: string; variant?: string; size?: string; children: JSX.Element }) {
  return (
    <a href={props.href} data-component="button-v2" data-variant={props.variant ?? "neutral"} data-size={props.size ?? "normal"}>
      {props.children}
    </a>
  )
}

function errorFromUrl() {
  const error = new URLSearchParams(location.search).get("error")
  if (!error) return null
  if (error === "access_denied") return "Slack sign in was cancelled."
  if (error === "state") return "That sign in link expired, try again."
  return error
}

// ---------- signed out

function Landing() {
  const error = errorFromUrl()
  return (
    <div class="max-w-[720px] mx-auto px-6 py-20 flex flex-col gap-12">
      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-2 title">
          <Coin size={24} /> bank
        </div>
        <h1 class="hero m-0">A tiny currency for your Slack.</h1>
        <p class="muted m-0 text-[15px] leading-6 max-w-[520px]">
          Everyone gets 100 coins. Give them away when someone helps you out, with a reaction or <span class="code">/bank give</span>.
          Spend them on whatever your team decides they're worth.
        </p>
        <div class="flex gap-2 pt-2">
          <ButtonLink href={`${BASE}/install`} variant="contrast" size="large">
            Add to Slack
          </ButtonLink>
          <ButtonLink href={`${BASE}/login`} size="large">
            Sign in with Slack
          </ButtonLink>
        </div>
        <Show when={error}>
          <p class="danger m-0">{error}</p>
        </Show>
      </div>

      <div class="grid sm:grid-cols-3 gap-3">
        <Feature title="React to give">
          Add a coin emoji to someone's message and that many coins move from you to them. Take it back by removing the reaction.
        </Feature>
        <Feature title="Or use the command">
          <span class="code">/bank give @adam 10 for the fix</span> posts it in the channel for everyone to see.
        </Feature>
        <Feature title="Make it yours">
          Admins rename the currency, set the starting balance, choose which emoji are worth what, and adjust balances.
        </Feature>
      </div>

      <EmojiPack />
    </div>
  )
}

function Feature(props: { title: string; children: JSX.Element }) {
  return (
    <div class="surface p-4 flex flex-col gap-1">
      <div class="font-semibold">{props.title}</div>
      <div class="muted">{props.children}</div>
    </div>
  )
}

const pack = [1, 5, 10, 20]

function EmojiPack(props: { domain?: string | null }) {
  return (
    <div class="surface p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-semibold">Coin emoji</div>
          <div class="muted">
            Slack doesn't let apps upload emoji, so add these yourself. Name them <span class="code">coin-1</span>,{" "}
            <span class="code">coin-5</span>, <span class="code">coin-10</span> and <span class="code">coin-20</span> to use the defaults.
          </div>
        </div>
        <Show when={props.domain}>
          <ButtonLink href={`https://${props.domain}.slack.com/customize/emoji`}>Add emoji in Slack</ButtonLink>
        </Show>
      </div>
      <div class="flex gap-4">
        <For each={pack}>
          {(value) => (
            <a href={`${BASE}/emoji/coin-${value}.png`} download={`coin-${value}.png`} class="flex flex-col items-center gap-1 link">
              <img src={`${BASE}/emoji/coin-${value}.png`} width={48} height={48} alt={`coin-${value}`} />
              <span class="code">:coin-{value}:</span>
            </a>
          )}
        </For>
      </div>
    </div>
  )
}

function NotInstalled(props: { me: Me }) {
  return (
    <div class="max-w-[520px] mx-auto px-6 py-24 flex flex-col gap-4">
      <div class="flex items-center gap-2 title">
        <Coin size={24} /> bank
      </div>
      <h1 class="hero m-0 text-[32px]">Bank isn't in {props.me.team.name} yet.</h1>
      <p class="muted m-0">Install it to give everyone their starting coins. Whoever installs it becomes the first admin.</p>
      <div class="flex gap-2">
        <ButtonLink href={`${BASE}/install`} variant="contrast" size="large">
          Add to Slack
        </ButtonLink>
        <ButtonLink href={`${BASE}/logout`} variant="ghost" size="large">
          Sign out
        </ButtonLink>
      </div>
    </div>
  )
}

// ---------- signed in

function Dashboard(props: { me: Me; refresh: () => void }) {
  const config = () => props.me.config
  const [tab, setTab] = createSignal("leaderboard")
  const [leaderboard, leaderboardActions] = createResource(() => api.leaderboard())
  const [history, historyActions] = createResource(() => api.history())
  const reload = () => {
    props.refresh()
    leaderboardActions.refetch()
    historyActions.refetch()
  }

  return (
    <div class="max-w-[760px] mx-auto px-5 py-8 flex flex-col gap-6">
      <header class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 title">
          <Coin size={22} /> bank
          <span class="faint font-normal">/</span>
          <span class="font-medium">{props.me.team.name}</span>
        </div>
        <div class="flex items-center gap-2">
          <Avatar src={props.me.user.image ?? undefined} fallback={props.me.user.name} size="normal" />
          <ButtonLink href={`${BASE}/logout`} variant="ghost-muted" size="small">
            Sign out
          </ButtonLink>
        </div>
      </header>

      <section class="surface p-5 flex items-end justify-between gap-4 flex-wrap">
        <div class="flex flex-col gap-1">
          <span class="muted">Your balance</span>
          <div class="flex items-baseline gap-2">
            <span class="display">{props.me.account?.balance ?? 0}</span>
            <span class="muted text-[15px]">
              {config().symbol} {(props.me.account?.balance ?? 0) === 1 ? config().singular : config().plural}
            </span>
          </div>
        </div>
        <div class="flex gap-6">
          <Stat label="Received" value={props.me.account?.received ?? 0} />
          <Stat label="Given" value={props.me.account?.given ?? 0} />
        </div>
      </section>

      <Tabs value={tab()} onChange={setTab} variant="pill">
        <Tabs.List>
          <Tabs.Trigger value="leaderboard">Leaderboard</Tabs.Trigger>
          <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
          <Tabs.Trigger value="give">Give</Tabs.Trigger>
          <Show when={props.me.admin}>
            <Tabs.Trigger value="admin">Admin</Tabs.Trigger>
          </Show>
        </Tabs.List>
      </Tabs>

      <Switch>
        <Match when={tab() === "leaderboard"}>
          <LeaderboardView me={props.me} accounts={leaderboard()?.accounts} />
        </Match>
        <Match when={tab() === "activity"}>
          <ActivityView me={props.me} history={history()} />
        </Match>
        <Match when={tab() === "give"}>
          <GiveView me={props.me} done={reload} />
        </Match>
        <Match when={tab() === "admin"}>
          <AdminView me={props.me} changed={reload} />
        </Match>
      </Switch>
    </div>
  )
}

function Stat(props: { label: string; value: number }) {
  return (
    <div class="flex flex-col items-end">
      <span class="faint">{props.label}</span>
      <span class="num font-semibold text-[15px]">{props.value}</span>
    </div>
  )
}

function Panel(props: { title?: string; description?: JSX.Element; action?: JSX.Element; children: JSX.Element }) {
  return (
    <section class="surface overflow-hidden">
      <Show when={props.title}>
        <div class="px-4 pt-4 pb-3 flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <div class="font-semibold">{props.title}</div>
            <Show when={props.description}>
              <div class="muted">{props.description}</div>
            </Show>
          </div>
          {props.action}
        </div>
      </Show>
      {props.children}
    </section>
  )
}

function LeaderboardView(props: { me: Me; accounts: Me["account"][] | undefined }) {
  return (
    <Panel>
      <Show when={props.accounts} fallback={<div class="p-4 muted">loading…</div>}>
        <Show when={props.accounts!.length} fallback={<div class="p-4 muted">Nobody has any yet.</div>}>
          <div>
            <For each={props.accounts}>
              {(account, index) => (
                <div
                  class="row flex items-center gap-3 px-4 py-2.5"
                  classList={{ "bg-[var(--v2-background-bg-layer-01)]": account!.id === props.me.user.id }}
                >
                  <span class="num faint w-6 text-right">{index() + 1}</span>
                  <Avatar src={account!.image ?? undefined} fallback={account!.name} size="normal" />
                  <span class="flex-1 truncate font-medium">{account!.name}</span>
                  <span class="faint num hidden sm:inline">{account!.received} received</span>
                  <span class="num font-semibold w-20 text-right">
                    {account!.balance} {props.me.config.symbol}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </Panel>
  )
}

function ago(at: number) {
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(at).toLocaleDateString()
}

function describe(entry: Entry, history: History, viewer: string | null) {
  const name = (id: string | null) => (id ? (id === viewer ? "you" : (history.people[id]?.name ?? id)) : "the bank")
  const via = entry.kind === "reaction" ? " with a reaction" : ""
  switch (entry.kind) {
    case "grant":
      return `${name(entry.to)} got a starting balance`
    case "adjust":
      return entry.to
        ? `${name(entry.actor)} added to ${name(entry.to)}'s balance`
        : `${name(entry.actor)} took from ${name(entry.from)}'s balance`
    case "refund":
      return `${name(entry.from)} got back a reaction from ${name(entry.to)}`.replace(/^you got back/, "you returned")
    default:
      return `${name(entry.from)} gave ${name(entry.to)}${via}`
  }
}

function ActivityList(props: { history: History | undefined; config: Config; viewer: string | null }) {
  return (
    <Show when={props.history} fallback={<div class="p-4 muted">loading…</div>}>
      <Show when={props.history!.entries.length} fallback={<div class="p-4 muted">Nothing yet.</div>}>
        <div>
          <For each={props.history!.entries}>
            {(entry) => {
              const incoming = () => props.viewer !== null && entry.to === props.viewer
              const outgoing = () => props.viewer !== null && entry.from === props.viewer
              const other = () => (incoming() ? entry.from : entry.to)
              const person = () => (other() ? props.history!.people[other()!] : undefined)
              return (
                <div class="row flex items-center gap-3 px-4 py-2.5">
                  <Avatar src={person()?.image ?? undefined} fallback={person()?.name ?? "B"} size="normal" />
                  <div class="flex-1 min-w-0 flex flex-col">
                    <span class="truncate">{describe(entry, props.history!, props.viewer)}</span>
                    <span class="faint truncate">
                      {ago(entry.at)}
                      <Show when={entry.note}> · {entry.note}</Show>
                      <Show when={entry.link}>
                        {" · "}
                        <a class="link" href={entry.link!} target="_blank" rel="noreferrer">
                          message
                        </a>
                      </Show>
                    </span>
                  </div>
                  <span class="num font-semibold" classList={{ positive: incoming(), muted: !incoming() && !outgoing() }}>
                    {incoming() ? "+" : outgoing() ? "−" : ""}
                    {currency(props.config, entry.amount)}
                  </span>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </Show>
  )
}

function ActivityView(props: { me: Me; history: History | undefined }) {
  return (
    <Panel>
      <ActivityList history={props.history} config={props.me.config} viewer={props.me.user.id} />
    </Panel>
  )
}

// ---------- give

// Everyone in the workspace, loaded once the first time a picker needs it and shared by every picker.
let directory: (() => Person[] | undefined) | undefined
function people() {
  directory ??= createRoot(() => createResource(() => api.people())[0])
  return directory()
}

function PersonPicker(props: { value: Person | null; onChange: (person: Person | null) => void; exclude?: string }) {
  const [query, setQuery] = createSignal("")
  const matches = createMemo(() => {
    const text = query().trim().toLowerCase()
    if (!text) return []
    return (people() ?? [])
      .filter((person) => person.id !== props.exclude && person.name.toLowerCase().includes(text))
      .slice(0, 6)
  })
  return (
    <Show
      when={props.value}
      fallback={
        <div class="relative">
          <TextInput
            placeholder={people() ? "Search people" : "Loading people…"}
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
          <Show when={matches().length}>
            <div class="surface absolute z-10 left-0 right-0 mt-1 p-1 shadow-lg">
              <For each={matches()}>
                {(person) => (
                  <button
                    type="button"
                    class="pick w-full flex items-center gap-2 text-left"
                    onClick={() => {
                      props.onChange(person)
                      setQuery("")
                    }}
                  >
                    <Avatar src={person.image ?? undefined} fallback={person.name} size="small" />
                    <span>{person.name}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      }
    >
      {(person) => (
        <div class="flex items-center gap-2 h-8">
          <Avatar src={person().image ?? undefined} fallback={person().name} size="small" />
          <span class="font-medium">{person().name}</span>
          <Button variant="ghost-muted" size="small" onClick={() => props.onChange(null)}>
            Change
          </Button>
        </div>
      )}
    </Show>
  )
}

function Label(props: { text: string; children: JSX.Element }) {
  return (
    <label class="flex flex-col gap-1.5">
      <span class="muted">{props.text}</span>
      {props.children}
    </label>
  )
}

function GiveView(props: { me: Me; done: () => void }) {
  const [person, setPerson] = createSignal<Person | null>(null)
  const [amount, setAmount] = createSignal("")
  const [note, setNote] = createSignal("")
  const [status, setStatus] = createSignal<{ kind: "error" | "ok"; text: string } | null>(null)
  const [busy, setBusy] = createSignal(false)
  const submit = async (event: Event) => {
    event.preventDefault()
    if (!person()) return setStatus({ kind: "error", text: "Pick someone first." })
    setBusy(true)
    setStatus(null)
    try {
      await api.give(person()!.id, Number(amount()), note())
      setStatus({ kind: "ok", text: `Sent ${currency(props.me.config, Number(amount()))} to ${person()!.name}.` })
      setAmount("")
      setNote("")
      setPerson(null)
      props.done()
    } catch (error) {
      setStatus({ kind: "error", text: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel
      title={`Give ${props.me.config.plural}`}
      description={
        <>
          Or use <span class="code">/bank give @someone 10</span> in Slack.
        </>
      }
    >
      <form class="px-4 pb-4 flex flex-col gap-3" onSubmit={submit}>
        <Label text="To">
          <PersonPicker value={person()} onChange={setPerson} exclude={props.me.user.id} />
        </Label>
        <div class="grid grid-cols-[120px_1fr] gap-3">
          <Label text="Amount">
            <TextInput inputmode="numeric" placeholder="10" value={amount()} onInput={(event) => setAmount(event.currentTarget.value)} />
          </Label>
          <Label text="For (optional)">
            <TextInput placeholder="fixing the deploy" value={note()} onInput={(event) => setNote(event.currentTarget.value)} />
          </Label>
        </div>
        <div class="flex items-center gap-3">
          <Button type="submit" variant="contrast" disabled={busy() || !amount()}>
            Give
          </Button>
          <Show when={status()}>
            <span classList={{ danger: status()!.kind === "error", positive: status()!.kind === "ok" }}>{status()!.text}</span>
          </Show>
        </div>
      </form>
    </Panel>
  )
}

// ---------- admin

function AdminView(props: { me: Me; changed: () => void }) {
  return (
    <div class="flex flex-col gap-4">
      <SettingsPanel me={props.me} changed={props.changed} />
      <AdjustPanel me={props.me} changed={props.changed} />
      <AdminsPanel me={props.me} />
      <ChannelsPanel />
      <EmojiPack domain={props.me.team.domain} />
      <AllActivityPanel me={props.me} />
    </div>
  )
}

function SettingsPanel(props: { me: Me; changed: () => void }) {
  const [draft, setDraft] = createStore<Config>(structuredClone(props.me.config))
  const [custom] = createResource(() => api.emoji().catch(() => []))
  const urls = createMemo(() => new Map((custom() ?? []).map((item) => [item.name, item.url])))
  const [filter, setFilter] = createSignal("")
  const [status, setStatus] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)

  const save = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const saved = await api.saveConfig(draft)
      setDraft(reconcile(saved))
      setStatus("Saved.")
      props.changed()
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const add = (name: string) => {
    if (draft.emoji.some((item) => item.name === name)) return
    setDraft("emoji", (list) => [...list, { name, amount: 1 }])
  }

  const shown = createMemo(() => {
    const text = filter().trim().toLowerCase()
    return (custom() ?? []).filter((item) => !text || item.name.includes(text)).slice(0, 80)
  })

  return (
    <Panel title="Currency" description="What it's called, how much everyone starts with, and which reactions give how much.">
      <div class="px-4 pb-4 flex flex-col gap-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Label text="Singular">
            <TextInput value={draft.singular} onInput={(event) => setDraft("singular", event.currentTarget.value)} />
          </Label>
          <Label text="Plural">
            <TextInput value={draft.plural} onInput={(event) => setDraft("plural", event.currentTarget.value)} />
          </Label>
          <Label text="Symbol">
            <TextInput value={draft.symbol} onInput={(event) => setDraft("symbol", event.currentTarget.value)} />
          </Label>
          <Label text="Starting balance">
            <TextInput
              inputmode="numeric"
              value={String(draft.starting)}
              onInput={(event) => setDraft("starting", Number(event.currentTarget.value) || 0)}
            />
          </Label>
        </div>
        <p class="faint m-0">The starting balance applies to people the first time Bank sees them. Existing balances don't change.</p>

        <Toggle checked={draft.notify} onChange={(value: boolean) => setDraft("notify", value)}>
          Message people when they get a reaction gift
        </Toggle>

        <div class="flex flex-col gap-2">
          <span class="muted">Reactions</span>
          <For each={draft.emoji} fallback={<span class="faint">No reactions set up. Pick some emoji below.</span>}>
            {(item, index) => (
              <div class="flex items-center gap-2">
                <Show when={urls().get(item.name)} fallback={<span class="emoji inline-block" />}>
                  <img class="emoji" src={urls().get(item.name)} alt="" />
                </Show>
                <div class="flex-1">
                  <TextInput
                    value={item.name}
                    onInput={(event) => setDraft("emoji", index(), "name", event.currentTarget.value.replace(/:/g, ""))}
                  />
                </div>
                <div class="w-24">
                  <TextInput
                    inputmode="numeric"
                    value={String(item.amount)}
                    onInput={(event) => setDraft("emoji", index(), "amount", Number(event.currentTarget.value) || 0)}
                  />
                </div>
                <Button
                  variant="ghost-muted"
                  size="small"
                  onClick={() => setDraft("emoji", (list) => list.filter((_, i) => i !== index()))}
                >
                  Remove
                </Button>
              </div>
            )}
          </For>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-3">
            <span class="muted">Your workspace's custom emoji · click one to add it</span>
            <div class="w-48">
              <TextInput appearance="small" placeholder="Filter" value={filter()} onInput={(event) => setFilter(event.currentTarget.value)} />
            </div>
          </div>
          <Show when={custom()} fallback={<span class="faint">loading…</span>}>
            <Show when={custom()!.length} fallback={<span class="faint">No custom emoji yet. Add some in Slack, then reload.</span>}>
              <div class="flex flex-wrap gap-1 max-h-48 overflow-auto">
                <For each={shown()}>
                  {(item) => (
                    <button type="button" class="pick" title={`:${item.name}:`} onClick={() => add(item.name)}>
                      <img class="emoji block" src={item.url} alt={item.name} loading="lazy" />
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>

        <div class="flex items-center gap-3">
          <Button variant="contrast" onClick={save} disabled={busy()}>
            Save
          </Button>
          <Show when={status()}>
            <span classList={{ positive: status() === "Saved.", danger: status() !== "Saved." }}>{status()}</span>
          </Show>
        </div>
      </div>
    </Panel>
  )
}

function AdjustPanel(props: { me: Me; changed: () => void }) {
  const [person, setPerson] = createSignal<Person | null>(null)
  const [amount, setAmount] = createSignal("")
  const [note, setNote] = createSignal("")
  const [status, setStatus] = createSignal<{ kind: "error" | "ok"; text: string } | null>(null)
  const run = async (sign: 1 | -1) => {
    if (!person()) return setStatus({ kind: "error", text: "Pick someone first." })
    try {
      await api.adjust(person()!.id, sign * Number(amount()), note())
      setStatus({ kind: "ok", text: `${sign > 0 ? "Added" : "Removed"} ${currency(props.me.config, Number(amount()))}.` })
      setAmount("")
      setNote("")
      props.changed()
    } catch (error) {
      setStatus({ kind: "error", text: (error as Error).message })
    }
  }
  return (
    <Panel title="Adjust a balance" description="Mint new coins for someone, or take some away.">
      <div class="px-4 pb-4 flex flex-col gap-3">
        <Label text="Person">
          <PersonPicker value={person()} onChange={setPerson} />
        </Label>
        <div class="grid grid-cols-[120px_1fr] gap-3">
          <Label text="Amount">
            <TextInput inputmode="numeric" value={amount()} onInput={(event) => setAmount(event.currentTarget.value)} />
          </Label>
          <Label text="Reason (optional)">
            <TextInput value={note()} onInput={(event) => setNote(event.currentTarget.value)} />
          </Label>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="contrast" disabled={!amount()} onClick={() => run(1)}>
            Add
          </Button>
          <Button variant="neutral" disabled={!amount()} onClick={() => run(-1)}>
            Remove
          </Button>
          <Show when={status()}>
            <span classList={{ danger: status()!.kind === "error", positive: status()!.kind === "ok" }}>{status()!.text}</span>
          </Show>
        </div>
      </div>
    </Panel>
  )
}

function AdminsPanel(props: { me: Me }) {
  const [admins, { refetch }] = createResource(() => api.admins())
  const [person, setPerson] = createSignal<Person | null>(null)
  const label = { installer: "Installed Bank", added: "Added", slack: "Slack admin" } as const
  return (
    <Panel title="Admins" description="Whoever installed Bank and your Slack admins are admins automatically.">
      <div>
        <For each={admins()}>
          {(admin) => (
            <div class="row flex items-center gap-3 px-4 py-2.5">
              <Avatar src={admin.image ?? undefined} fallback={admin.name} size="normal" />
              <span class="flex-1 font-medium">{admin.name}</span>
              <Badge variant="subtle">{label[admin.source]}</Badge>
              <Show when={admin.source === "added" && admin.id !== props.me.user.id}>
                <Button variant="ghost-muted" size="small" onClick={() => api.removeAdmin(admin.id).then(refetch)}>
                  Remove
                </Button>
              </Show>
            </div>
          )}
        </For>
        <div class="row px-4 py-3 flex items-center gap-2">
          <div class="flex-1">
            <PersonPicker value={person()} onChange={setPerson} />
          </div>
          <Button
            disabled={!person()}
            onClick={() =>
              api.addAdmin(person()!.id).then(() => {
                setPerson(null)
                refetch()
              })
            }
          >
            Add admin
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function ChannelsPanel() {
  const [status, setStatus] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)
  const join = async () => {
    setBusy(true)
    try {
      const result = await api.join()
      setStatus(result.joined ? `Joined ${result.joined} channels.` : "Already in every public channel.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel
      title="Channels"
      description="Slack only tells Bank about reactions in channels it's in. Invite it with /invite @Bank, or join every public channel at once."
      action={
        <Button onClick={join} disabled={busy()}>
          {busy() ? "Joining…" : "Join public channels"}
        </Button>
      }
    >
      <Show when={status()}>
        <div class="px-4 pb-4 muted">{status()}</div>
      </Show>
    </Panel>
  )
}

function AllActivityPanel(props: { me: Me }) {
  const [history] = createResource(() => api.allHistory())
  return (
    <Panel title="Everything" description="Every transaction in the workspace, newest first.">
      <ActivityList history={history()} config={props.me.config} viewer={null} />
    </Panel>
  )
}
