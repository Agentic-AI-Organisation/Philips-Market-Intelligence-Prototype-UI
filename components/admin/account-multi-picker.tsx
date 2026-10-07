"use client"

import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { Account } from "@/lib/types"

interface AccountMultiPickerProps {
  id?: string
  accounts: Account[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  alreadyScheduledCount: number
  invalid?: boolean
}

type View = "all" | "selected"

export function AccountMultiPicker({
  id,
  accounts,
  selected,
  onChange,
  alreadyScheduledCount,
  invalid,
}: AccountMultiPickerProps) {
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState<string>("all")
  const [view, setView] = useState<View>("all")
  const deferredQuery = useDeferredValue(query)
  const lastClickedIndex = useRef<number | null>(null)

  const regions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of accounts) {
      const r = a.location.region ?? "Other"
      counts.set(r, (counts.get(r) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [accounts])

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return accounts.filter((a) => {
      if (view === "selected" && !selected.has(a.account_id)) return false
      if (region !== "all" && (a.location.region ?? "Other") !== region) return false
      if (!q) return true
      return a.hospital_name.toLowerCase().includes(q) || a.account_id.toLowerCase().includes(q)
    })
  }, [accounts, deferredQuery, region, view, selected])

  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const visibleSelectedCount = useMemo(
    () => visible.reduce((n, a) => n + (selected.has(a.account_id) ? 1 : 0), 0),
    [visible, selected],
  )
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length
  const hiddenSelectedCount = selected.size - visibleSelectedCount

  const toggle = useCallback(
    (index: number, shiftKey: boolean) => {
      const list = visibleRef.current
      const current = selectedRef.current
      const target = list[index]
      if (!target) return
      const next = new Set(current)
      const shouldSelect = !current.has(target.account_id)
      const anchor = lastClickedIndex.current
      if (shiftKey && anchor !== null && anchor < list.length) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
        for (let i = from; i <= to; i++) {
          if (shouldSelect) next.add(list[i].account_id)
          else next.delete(list[i].account_id)
        }
      } else if (shouldSelect) {
        next.add(target.account_id)
      } else {
        next.delete(target.account_id)
      }
      lastClickedIndex.current = index
      onChange(next)
    },
    [onChange],
  )

  function toggleAllVisible() {
    const next = new Set(selected)
    if (allVisibleSelected) for (const a of visible) next.delete(a.account_id)
    else for (const a of visible) next.add(a.account_id)
    onChange(next)
  }

  function resetFilters() {
    setQuery("")
    setRegion("all")
    setView("all")
    lastClickedIndex.current = null
  }

  const filtersActive = query !== "" || region !== "all" || view !== "all"

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      <div className="flex flex-col gap-2 border-b p-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={id}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              lastClickedIndex.current = null
            }}
            placeholder={`Search ${accounts.length.toLocaleString()} available accounts by name or ID…`}
            className="h-8 bg-background pl-8 text-sm"
            aria-controls="account-grid"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by region">
          <FilterChip active={region === "all"} onClick={() => setRegion("all")}>
            All regions
          </FilterChip>
          {regions.map(([name, count]) => (
            <FilterChip key={name} active={region === name} onClick={() => setRegion(name)}>
              {name} <span className="tabular-nums opacity-60">{count.toLocaleString()}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-2.5 py-1.5">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium select-none">
          <input
            type="checkbox"
            className="size-3.5 accent-primary"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = visibleSelectedCount > 0 && !allVisibleSelected
            }}
            onChange={toggleAllVisible}
            disabled={visible.length === 0}
          />
          {allVisibleSelected ? "Deselect" : "Select"} {filtersActive ? "all shown" : "all"} (
          {visible.length.toLocaleString()})
        </label>

        <div className="flex items-center gap-1">
          <div role="radiogroup" aria-label="Show" className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {(["all", "selected"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => {
                  setView(v)
                  lastClickedIndex.current = null
                }}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  view === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "all" ? "All" : `Selected (${selected.size.toLocaleString()})`}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        id="account-grid"
        role="group"
        aria-label="Accounts"
        className="grid max-h-[22rem] min-h-40 auto-rows-min grid-cols-2 content-start gap-1 overflow-y-auto border-t p-2 sm:grid-cols-3 xl:grid-cols-4"
      >
        {visible.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {accounts.length === 0 ? "Every account already has a schedule for this research area." : "No accounts match."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium underline underline-offset-2"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          visible.map((account, index) => (
            <AccountChip
              key={account.account_id}
              account={account}
              index={index}
              checked={selected.has(account.account_id)}
              onToggle={toggle}
            />
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <span aria-live="polite">
          <span className="font-semibold text-foreground tabular-nums">{selected.size.toLocaleString()}</span> selected
          {hiddenSelectedCount > 0 && ` · ${hiddenSelectedCount.toLocaleString()} hidden by filters`}
        </span>
        <span>
          {alreadyScheduledCount > 0 && `${alreadyScheduledCount.toLocaleString()} already scheduled, hidden · `}
          Shift-click to select a range
        </span>
      </div>
    </div>
  )
}

const AccountChip = memo(function AccountChip({
  account,
  index,
  checked,
  onToggle,
}: {
  account: Account
  index: number
  checked: boolean
  onToggle: (index: number, shiftKey: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={`${account.hospital_name} · ${account.account_id}`}
      onClick={(e) => onToggle(index, e.shiftKey)}
      className={cn(
        "group flex h-8 min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-left transition-colors select-none focus-visible:outline-2 focus-visible:outline-ring",
        checked
          ? "border-primary bg-primary/5 text-foreground"
          : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
        )}
      >
        {checked && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-xs font-medium">{account.hospital_name}</span>
        <span className="truncate text-[10px] text-muted-foreground tabular-nums">{account.account_id}</span>
      </span>
    </button>
  )
})

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
