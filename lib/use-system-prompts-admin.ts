"use client"

import useSWR, { useSWRConfig } from "swr"
import { useCallback } from "react"
import * as api from "./mock-api"
import { ApiError } from "./types"

const KEY = "admin-system-prompts"

// GET /system-prompts is admin-gated in the real app (the admin panel's copy
// of the library); the chat widget's picker has its own hook in
// use-prompts-data.ts.
async function fetchAdminSystemPrompts() {
  if (!api.getMockChatAdminRole()) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    throw new ApiError(401, "Missing required role: research.admin")
  }
  return api.listSystemPrompts()
}

export function useAdminSystemPrompts() {
  const { data, error, isLoading } = useSWR(KEY, fetchAdminSystemPrompts, {
    revalidateOnFocus: false,
  })
  return { prompts: data, error, isLoading }
}

// Refreshes the admin list plus the chat widget's system / quick prompt lists
// (same underlying rows).
export function useRevalidateAdminPrompts() {
  const { mutate } = useSWRConfig()
  return useCallback(
    () =>
      mutate((key) => key === KEY || key === "system-prompts" || key === "quick-prompts"),
    [mutate],
  )
}
