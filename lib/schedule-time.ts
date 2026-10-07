import type { FrequencyType, ScheduleConfig } from "./types"

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const SUNDAY_FIRST = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom_interval: "Custom",
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    partsFormatters.set(timeZone, formatter)
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

function offsetMs(date: Date, timeZone: string) {
  const p = getZonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - (date.getTime() - date.getMilliseconds())
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const firstOffset = offsetMs(new Date(guess), timeZone)
  let result = guess - firstOffset
  const secondOffset = offsetMs(new Date(result), timeZone)
  if (secondOffset !== firstOffset) result = guess - secondOffset
  return new Date(result)
}

type NextRunInput = Pick<
  ScheduleConfig,
  | "frequency_type"
  | "days_of_week"
  | "day_of_month"
  | "interval_days"
  | "time_of_day"
  | "timezone"
>

/** Mirrors the backend's compute_next_run_at (schedule_time.py). */
export function computeNextRunAt(row: NextRunInput, from: Date = new Date()): Date | null {
  const tz = row.timezone
  const [hour, minute] = row.time_of_day.split(":").map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  const local = getZonedParts(from, tz)

  const localDate = (addDays: number) =>
    new Date(Date.UTC(local.year, local.month - 1, local.day + addDays))
  const at = (addDays: number) => {
    const d = localDate(addDays)
    return zonedTimeToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute, tz)
  }

  switch (row.frequency_type) {
    case "daily": {
      const candidate = at(0)
      return candidate <= from ? at(1) : candidate
    }
    case "weekly": {
      const days = new Set(
        (row.days_of_week ?? "")
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
      )
      if (days.size === 0) return null
      for (let i = 0; i <= 7; i++) {
        const weekday = SUNDAY_FIRST[localDate(i).getUTCDay()]
        if (!days.has(weekday)) continue
        const candidate = at(i)
        if (candidate > from) return candidate
      }
      return null
    }
    case "monthly": {
      const dom = row.day_of_month
      if (!dom || dom < 1 || dom > 28) return null
      const candidate = zonedTimeToUtc(local.year, local.month, dom, hour, minute, tz)
      if (candidate > from) return candidate
      const next = new Date(Date.UTC(local.year, local.month, dom))
      return zonedTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, dom, hour, minute, tz)
    }
    case "custom_interval": {
      const interval = row.interval_days
      if (!interval || interval < 1) return null
      const candidate = at(0)
      return candidate <= from ? at(interval) : candidate
    }
  }
}

const SHORT_DAY: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

export function shortDay(day: string) {
  return SHORT_DAY[day] ?? day
}

export function ordinal(n: number) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"
  return `${n}${suffix}`
}

export function sortDays(days: string[]) {
  return [...days].sort(
    (a, b) => WEEKDAYS.indexOf(a as never) - WEEKDAYS.indexOf(b as never),
  )
}

export function describeFrequency(row: NextRunInput) {
  switch (row.frequency_type) {
    case "daily":
      return "Daily"
    case "weekly": {
      const days = sortDays((row.days_of_week ?? "").split(",").filter(Boolean))
      return days.length === 7 ? "Every day" : `Weekly · ${days.map(shortDay).join(", ")}`
    }
    case "monthly":
      return `Monthly · ${row.day_of_month ? ordinal(row.day_of_month) : "?"}`
    case "custom_interval":
      return `Every ${row.interval_days ?? "?"} ${row.interval_days === 1 ? "day" : "days"}`
  }
}

export function formatTimeOfDay(time: string) {
  return time.slice(0, 5)
}

export function formatInZone(
  iso: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = typeof iso === "string" ? new Date(iso) : iso
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...options,
  }).format(date)
}

export function zoneAbbreviation(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? timeZone
}

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function formatRelative(iso: string | Date, now: Date = new Date()) {
  const date = typeof iso === "string" ? new Date(iso) : iso
  const diffMs = date.getTime() - now.getTime()
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < hour) return relativeFormatter.format(Math.round(diffMs / minute), "minute")
  if (abs < day) return relativeFormatter.format(Math.round(diffMs / hour), "hour")
  return relativeFormatter.format(Math.round(diffMs / day), "day")
}

export function formatUtc(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]

export function getTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : FALLBACK_ZONES
  return ["UTC", ...supported.filter((z) => z !== "UTC")]
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

// Curated down from the full IANA list — these are the zones the real
// product's admin base actually needs. Keep in sync with
// itaap-commercialit-account-intelligence-ui's utils/scheduleTime.ts.
export const SCHEDULING_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Rome",
  "America/Puerto_Rico",
  "America/Bogota",
  "Australia/Sydney",
  "Asia/Kolkata",
]

/** The default selection for the timezone field. */
export const DEFAULT_TIMEZONE = "Asia/Kolkata"

/** Keeps an existing row's timezone if it's still a supported choice, otherwise falls back. */
export function defaultTimezone(preferred?: string | null): string {
  if (preferred && SCHEDULING_TIMEZONES.includes(preferred)) return preferred
  return DEFAULT_TIMEZONE
}
