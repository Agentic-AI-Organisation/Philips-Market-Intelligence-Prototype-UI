"use client"

import useSWR, { useSWRConfig } from "swr"
import { useCallback, useMemo } from "react"
import * as api from "./mock-api"
import type { ListRunHistoryParams, ListSchedulesParams } from "./types"

export function useAccounts() {
  const { data, isLoading } = useSWR("accounts", api.listAccounts, {
    revalidateOnFocus: false,
  })
  const byId = useMemo(
    () => new Map((data ?? []).map((a) => [a.account_id, a])),
    [data],
  )
  return { accounts: data ?? [], accountsById: byId, isLoading }
}

export function useModelConfig() {
  const { data, error, isLoading, mutate } = useSWR("model-config", api.listModelConfig)
  const byId = useMemo(
    () => new Map((data ?? []).map((r) => [r.research_group_id, r])),
    [data],
  )
  return { researchAreas: data ?? [], researchAreasById: byId, error, isLoading, mutate }
}

export function useSchedules(params: ListSchedulesParams) {
  return useSWR(["schedules", params], ([, p]) => api.listSchedules(p), {
    keepPreviousData: true,
  })
}

export function useScheduleCoverage() {
  const { data, isLoading } = useSWR(["schedules", "coverage"], api.getScheduleCoverage)
  const byArea = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const [areaId, ids] of Object.entries(data ?? {})) map.set(areaId, new Set(ids))
    return map
  }, [data])
  return { coverage: byArea, isLoading: isLoading && !data }
}

export function useRunHistory(params: ListRunHistoryParams) {
  return useSWR(["run-history", params], ([, p]) => api.listRunHistory(p), {
    keepPreviousData: true,
  })
}

export function useRevalidateSchedules() {
  const { mutate } = useSWRConfig()
  return useCallback(
    () => mutate((key) => Array.isArray(key) && key[0] === "schedules"),
    [mutate],
  )
}

export function researchAreaLabel(name: string | undefined, fallback: string) {
  if (!name) return fallback
  return name
    .split("_")
    .map((w) => (w === "and" ? "&" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
}
