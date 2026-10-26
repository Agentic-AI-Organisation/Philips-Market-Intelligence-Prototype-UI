"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"
import * as api from "./mock-api"

// The real UI polls every 8s; the mock run only lasts a few seconds, so poll
// faster to keep the transition observable.
const RUNNING_POLL_INTERVAL_MS = 2000
// Upper bound for the post-trigger watch: confirmation must arrive by then,
// otherwise we stop polling and leave the page as-is.
const TRIGGER_WATCH_MAX_POLLS = 112

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

// Polls while the last run is "running" or while a manual trigger is being
// watched (so a run that finished before any poll saw "running" still gets
// picked up), and stops once it settles.
export function useGroupStatus(accountId: string | null, groupId: string | undefined, watching = false) {
  return useSWR(
    accountId && groupId ? ["group-status", accountId, groupId] : null,
    ([, a, g]) => api.getGroupStatus(a, g),
    {
      refreshInterval: (data) =>
        watching || data?.last_run_status === "running" ? RUNNING_POLL_INTERVAL_MS : 0,
    },
  )
}

// Trigger-tracked run: POST the run, handle "already running", then watch the
// status until completion is confirmed (was running, or a fresher
// last_run_timestamp than the baseline) and refresh output + summary.
export function useResearchRun(accountId: string | null, groupId: string | undefined, onComplete: () => void) {
  const [triggering, setTriggering] = useState(false)
  const [watching, setWatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyRunning, setAlreadyRunning] = useState(false)
  const baselineRef = useRef<string | null>(null)
  const pollsRef = useRef(0)
  const prevStatusRef = useRef<string | null | undefined>(undefined)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const { data: status, mutate: refreshStatus } = useGroupStatus(accountId, groupId, watching)

  // Reset all trigger tracking when the (account, area) pair changes.
  useEffect(() => {
    setWatching(false)
    setError(null)
    setAlreadyRunning(false)
    pollsRef.current = 0
    prevStatusRef.current = undefined
  }, [accountId, groupId])

  useEffect(() => {
    if (!status) return
    const wasRunning = prevStatusRef.current === "running"
    prevStatusRef.current = status.last_run_status ?? null
    if (!watching || status.last_run_status === "running") return
    pollsRef.current += 1
    const base = baselineRef.current
    const fresh = !!status.last_run_timestamp && (!base || status.last_run_timestamp > base)
    if (wasRunning || fresh) {
      setWatching(false)
      setAlreadyRunning(false)
      onCompleteRef.current()
    } else if (pollsRef.current >= TRIGGER_WATCH_MAX_POLLS) {
      setWatching(false)
    }
  }, [status, watching])

  const runNow = useCallback(async () => {
    if (!accountId || !groupId) return
    setTriggering(true)
    setError(null)
    try {
      baselineRef.current = status?.last_run_timestamp ?? null
      const result = await api.runGroup(groupId, accountId)
      setAlreadyRunning(result.already_running)
      pollsRef.current = 0
      setWatching(true)
      await refreshStatus()
    } catch (err) {
      setWatching(false)
      setError(err instanceof Error ? err.message : "Failed to trigger research run")
    } finally {
      setTriggering(false)
    }
  }, [accountId, groupId, status, refreshStatus])

  return {
    status,
    isRunning: triggering || status?.last_run_status === "running",
    alreadyRunning: alreadyRunning && status?.last_run_status === "running",
    error,
    clearError: () => setError(null),
    runNow,
  }
}
