"use client"

import useSWR from "swr"
import * as api from "./mock-api"

const RUNNING_POLL_INTERVAL_MS = 8000

export function useGroupOutput(accountId: string | null, groupId: string | undefined) {
  return useSWR(
    accountId && groupId ? ["group-output", accountId, groupId] : null,
    ([, a, g]) => api.getGroupOutput(a, g),
  )
}

export function useGroupSummary(accountId: string | null, groupId: string | undefined) {
  return useSWR(
    accountId && groupId ? ["group-summary", accountId, groupId] : null,
    ([, a, g]) => api.getGroupSummary(a, g),
  )
}

// Polls every 8s while the last run is still "running" — same cadence as
// the real UI's scoped status poll — and stops once it settles.
export function useGroupStatus(accountId: string | null, groupId: string | undefined) {
  return useSWR(
    accountId && groupId ? ["group-status", accountId, groupId] : null,
    ([, a, g]) => api.getGroupStatus(a, g),
    {
      refreshInterval: (data) => (data?.last_run_status === "running" ? RUNNING_POLL_INTERVAL_MS : 0),
    },
  )
}
