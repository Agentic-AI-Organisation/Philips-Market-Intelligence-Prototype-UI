"use client"

import useSWR from "swr"
import * as api from "./mock-api"
import type { SignalEntry, SignalType } from "./types"

// Fixed, hardcoded for now - more signal types will be added later via
// code, not an admin config (see mock-api.ts's own comment on `signals`).
export const SIGNAL_TYPES: { type: SignalType; label: string }[] = [
  { type: "c_suite_change", label: "C-Suite Change" },
  { type: "new_acquisition", label: "New Acquisition" },
  { type: "new_construction_site", label: "New Construction Site" },
]

export function useSignals() {
  const { data, isLoading } = useSWR("signals", api.listSignals)
  return { signals: data ?? [], isLoading }
}

// Newest first - callers show the first entry as "the latest" and the rest
// under a "+N more" expansion.
export function signalsFor(signals: SignalEntry[], accountId: string, type: SignalType): SignalEntry[] {
  return signals
    .filter((s) => s.account_id === accountId && s.signal_type === type)
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
}

// The most recent event_date across every signal type for this account, or
// null if it has none - used to sort the Accounts table so accounts with
// fresh activity surface first instead of being buried alphabetically.
export function latestSignalDate(signals: SignalEntry[], accountId: string): string | null {
  let latest: string | null = null
  for (const s of signals) {
    if (s.account_id === accountId && (!latest || s.event_date > latest)) latest = s.event_date
  }
  return latest
}
