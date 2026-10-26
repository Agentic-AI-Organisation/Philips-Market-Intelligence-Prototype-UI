"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Account } from "@/lib/types"

const RENDER_CAP = 200

interface AccountMultiPickerProps {
  id?: string
  accounts: Account[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  alreadyScheduledCount: number
  invalid?: boolean
}

/** Multi-column checkbox grid for bulk-creating one schedule per account. */
export function AccountMultiPicker({
  id,
  accounts,
  selected,
  onChange,
  alreadyScheduledCount,
  invalid,
}: AccountMultiPickerProps) {
  const [query, setQuery] = useState("")
  const headerRef = useRef<HTMLInputElement>(null)

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? accounts.filter((a) => [a.hospital_name, a.account_id].some((t) => t.toLowerCase().includes(q)))
      : accounts
  }, [accounts, query])
  const rendered = useMemo(() => matched.slice(0, RENDER_CAP), [matched])

  const matchedIds = useMemo(() => matched.map((a) => a.account_id), [matched])
  const selectedMatchedCount = matchedIds.filter((accountId) => selected.has(accountId)).length
  const allMatchedSelected = matchedIds.length > 0 && selectedMatchedCount === matchedIds.length

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = selectedMatchedCount > 0 && !allMatchedSelected
    }
  }, [selectedMatchedCount, allMatchedSelected])

  function toggle(accountId: string) {
    const next = new Set(selected)
    if (next.has(accountId)) next.delete(accountId)
    else next.add(accountId)
    onChange(next)
  }

  function toggleAll() {
    const next = new Set(selected)
    if (allMatchedSelected) matchedIds.forEach((accountId) => next.delete(accountId))
    else matchedIds.forEach((accountId) => next.add(accountId))
    onChange(next)
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
          <input
            ref={headerRef}
            type="checkbox"
            checked={allMatchedSelected}
            onChange={toggleAll}
            disabled={matchedIds.length === 0}
            className="size-4 shrink-0 accent-primary"
          />
          <span className="font-medium whitespace-nowrap">Select all ({matchedIds.length.toLocaleString()})</span>
        </label>
        <input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts or IDs…"
          aria-label="Search accounts"
          className="min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted/60"
        />
      </div>
      {rendered.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {accounts.length === 0 ? "Every account already has a schedule for this research area." : "No accounts found."}
        </p>
      ) : (
        <ul className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4">
          {rendered.map((account) => {
            const checked = selected.has(account.account_id)
            return (
              <li key={account.account_id} title={`${account.hospital_name} (${account.account_id})`}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 hover:bg-muted/60",
                    checked ? "border-primary/30 bg-primary/5" : "border-transparent",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(account.account_id)}
                    aria-label={`${account.hospital_name} (${account.account_id})`}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{account.hospital_name}</span>
                    <span className="block text-xs text-muted-foreground">{account.account_id}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {selected.size} selected
          {alreadyScheduledCount > 0 && ` · ${alreadyScheduledCount} already scheduled (hidden)`}
        </span>
        {matched.length > RENDER_CAP && (
          <span className="shrink-0">
            Showing first {RENDER_CAP} of {matched.length.toLocaleString()} — refine search
          </span>
        )}
      </div>
    </div>
  )
}
