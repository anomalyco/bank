import type { Cadence } from "../shared/types"

/** Scheduled grants land at this hour, in the time zone of the admin who set them up. */
const HOUR = 9

export function validTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function wall(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") }
}

/** The instant a wall-clock time happens in a time zone. Month and day overflow roll over, as with Date.UTC. */
function instant(year: number, month: number, day: number, hour: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day, hour)
  const offset = (at: number) => {
    const local = wall(at, timeZone)
    return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - at
  }
  // A second pass settles the offset when the first guess lands on the other side of a daylight saving change.
  const first = target - offset(target)
  return target - offset(first)
}

/** The first run strictly after `after`. */
export function nextRun(cadence: Cadence, day: number, timeZone: string, after: number) {
  const today = wall(after, timeZone)
  if (cadence === "monthly") {
    for (let month = 0; month <= 2; month++) {
      const at = instant(today.year, today.month + month, day, HOUR, timeZone)
      if (at > after) return at
    }
  } else {
    for (let offset = 0; offset <= 7; offset++) {
      const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset))
      if (date.getUTCDay() !== day) continue
      const at = instant(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), HOUR, timeZone)
      if (at > after) return at
    }
  }
  throw new Error("no next run")
}
