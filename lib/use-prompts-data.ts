"use client"

import useSWR, { useSWRConfig } from "swr"
import { useCallback } from "react"
import * as api from "./mock-api"

export function useSystemPrompts() {
  const { data, error, isLoading } = useSWR("system-prompts", api.listSystemPrompts)
  return { systemPrompts: data ?? [], error, isLoading }
}

export function useQuickPrompts() {
  return useSWR("quick-prompts", api.listQuickPrompts)
}

export function useSavedPrompts(userId: string | null) {
  const { data, isLoading } = useSWR(userId ? ["saved-prompts", userId] : null, ([, id]) => api.listSavedPrompts(id))
  return { savedPrompts: data ?? [], isLoading }
}

// Revalidates every prompts-related SWR key — system prompts, quick
// prompts (derived from the same underlying rows), and saved prompts.
export function useRevalidatePrompts() {
  const { mutate } = useSWRConfig()
  return useCallback(
    () =>
      mutate(
        (key) =>
          key === "system-prompts" ||
          key === "quick-prompts" ||
          (Array.isArray(key) && key[0] === "saved-prompts"),
      ),
    [mutate],
  )
}
