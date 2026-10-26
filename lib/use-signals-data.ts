"use client"

import useSWR from "swr"
import { listAccountSignals, listAccountsPage } from "./mock-signals"
import type { Account, AccountSignal } from "./types"

export const PAGE_SIZE = 20

// Display order for the known titles; any extra titles the backend sends are
// appended alphabetically after these.
export const KNOWN_SIGNAL_TYPES = ["C-Suite Change", "New Acquisition", "New Construction Site"] as const

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  c_suite_change: "C-Suite Change",
  new_acquisition: "New Acquisition",
  new_construction_site: "New Construction Site",
}

type AnySignal = object

const r = (row: AnySignal | null | undefined) => row as Record<string, unknown> | null | undefined

export function signalKey(row: AnySignal | null | undefined): string {
  const title = r(row)?.signal_title ?? r(row)?.signal_type
  return typeof title === "string" && title.trim() !== "" ? title : "Unknown"
}

export function signalTypeLabel(signalType: unknown): string {
  if (typeof signalType !== "string" || signalType.trim() === "") return "Unknown"
  if (SIGNAL_TYPE_LABELS[signalType]) return SIGNAL_TYPE_LABELS[signalType]
  // Already-human titles ("C-Suite Change") pass through untouched.
  if (!signalType.includes("_")) return signalType
  return signalType
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/** Newest timestamp for a row - prefers updated_at, falls back for legacy rows. */
export function signalDate(row: AnySignal | null | undefined): string {
  const v = r(row)?.updated_at ?? r(row)?.created_at ?? r(row)?.signal_date ?? r(row)?.generated_at
  return typeof v === "string" ? v : ""
}

/** Main body text for a row - prefers signal_output, falls back for legacy rows. */
export function signalText(row: AnySignal | null | undefined): string {
  const v = r(row)?.signal_output ?? r(row)?.description ?? r(row)?.title
  return typeof v === "string" ? v : ""
}

/** "2026-08-06" -> "6 Aug 2026". */
export function formatSignalDate(isoDate: unknown): string {
  if (typeof isoDate !== "string" || isoDate.trim() === "") return "—"
  const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  if (y && m && d) return new Date(y, m - 1, d).toLocaleDateString("en-GB", fmt)
  const parsed = new Date(isoDate)
  return Number.isNaN(parsed.getTime()) ? isoDate : parsed.toLocaleDateString("en-GB", fmt)
}

export type SignalsByAccount = Map<string, Map<string, AccountSignal[]>>

/** Group rows by account, then signal title, newest first by updated_at. */
export function groupSignals(rows: AccountSignal[]): SignalsByAccount {
  const byAccount: SignalsByAccount = new Map()
  for (const row of rows) {
    if (!row || typeof row.account_id !== "string") continue
    const key = signalKey(row)
    let byType = byAccount.get(row.account_id)
    if (!byType) {
      byType = new Map()
      byAccount.set(row.account_id, byType)
    }
    const list = byType.get(key) ?? []
    list.push(row)
    byType.set(key, list)
  }
  for (const byType of byAccount.values()) {
    for (const list of byType.values()) {
      list.sort((a, b) => (signalDate(a) < signalDate(b) ? 1 : -1))
    }
  }
  return byAccount
}

/** Column order: known titles first, extras alphabetically. */
export function signalColumns(rows: AccountSignal[]): string[] {
  const seen = new Set(rows.map((r) => signalKey(r)))
  const known = KNOWN_SIGNAL_TYPES as readonly string[]
  const extras = [...seen].filter((t) => !known.includes(t)).sort()
  return [...known.filter((t) => seen.has(t)), ...extras]
}

interface AccountsPageData {
  items: Account[]
  total: number
  signals: AccountSignal[]
}

// One page of accounts (server-side limit/offset/search) plus the signals for
// just that page's accounts. The previous page's data is kept while the next
// one loads, so the table doesn't flash a skeleton on every page change.
export function useAccountsPage(page: number, search: string) {
  const { data, error, isLoading } = useSWR<AccountsPageData>(
    ["accounts-page", page, search],
    async () => {
      const res = await listAccountsPage({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, search: search || undefined })
      const ids = res.items.map((a) => a.account_id)
      const signals = ids.length > 0 ? await listAccountSignals(ids) : []
      return { items: res.items, total: res.total, signals }
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  )
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    signals: data?.signals,
    error: error ? (error instanceof Error ? error.message : "Failed to load accounts") : null,
    isLoading,
  }
}
