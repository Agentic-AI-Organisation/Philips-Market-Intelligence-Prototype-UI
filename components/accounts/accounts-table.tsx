"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Expand, Search } from "lucide-react"
import { useAccountsPage, groupSignals, signalColumns, signalText, signalTypeLabel, PAGE_SIZE } from "@/lib/use-signals-data"
import type { AccountSignal } from "@/lib/types"
import { SignalListPopover, type PopoverAnchor } from "./signal-list-popover"

const SEARCH_DEBOUNCE_MS = 300

// Seam between the frozen Account column and the scrolling ones: a 1px inset
// shadow rather than a border, since borders don't travel with sticky cells.
const SEAM = "shadow-[inset_-1px_0_0_0_var(--border)]"

interface AccountsTableProps {
  onSelectAccount: (accountId: string) => void
}

interface OpenSignals {
  accountId: string
  name: string
  type: string
  items: AccountSignal[]
  anchorEl: HTMLElement
  anchor: PopoverAnchor
}

export function AccountsTable({ onSelectAccount }: AccountsTableProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<OpenSignals | null>(null)

  // Debounce the search box - the query filters server-side across the full
  // account base, and a new search always restarts from page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const { items, total, signals, error, isLoading } = useAccountsPage(page, debouncedQuery)

  const columns = useMemo(() => signalColumns(signals ?? []), [signals])
  const byAccount = useMemo(() => groupSignals(signals ?? []), [signals])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  const loading = isLoading

  return (
    // Content sits 6px inside the main padding, matching the source layout.
    <div className="mx-1.5 flex flex-col gap-5">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts…"
          aria-label="Search accounts"
          className="h-10 w-full max-w-xs rounded-lg border border-input bg-card pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading && !signals ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="px-6 py-12 text-center text-sm text-destructive">
            Couldn&apos;t load accounts. {error}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="border-b bg-muted text-sm font-semibold text-foreground/80">
                  <th className={`sticky left-0 z-20 w-64 bg-muted px-5 py-2.5 ${SEAM}`}>Account</th>
                  {columns.map((type, i) => (
                    // First column sits against the frozen cell: its seam is
                    // the sticky cell's inset shadow, so no border here.
                    <th key={type} className={i === 0 ? "px-4 py-2.5" : "border-l px-4 py-2.5"}>
                      {signalTypeLabel(type)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((account) => (
                  // bg-card on the row so the sticky first cell has an opaque,
                  // hover-reactive background (bg-inherit).
                  <tr key={account.account_id} className="bg-card hover:bg-muted">
                    <td className={`sticky left-0 z-10 w-64 max-w-64 bg-inherit px-5 py-3 align-top ${SEAM}`}>
                      <button
                        type="button"
                        onClick={() => onSelectAccount(account.account_id)}
                        title={account.hospital_name}
                        aria-label={`${account.hospital_name} (${account.account_id})`}
                        className="flex w-full flex-col gap-0.5 text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="w-full truncate text-xs font-medium text-primary underline">
                          {account.hospital_name}
                        </span>
                      </button>
                    </td>
                    {columns.map((type, i) => {
                      const divider = i === 0 ? "" : "border-l "
                      const cell = byAccount.get(account.account_id)?.get(type) ?? []
                      const [latest] = cell
                      const preview = latest ? signalText(latest) : ""
                      if (!latest || !preview) {
                        return (
                          <td key={type} className={`${divider}px-4 py-3 align-top`}>
                            <span className="text-xs text-muted-foreground/70">—</span>
                          </td>
                        )
                      }
                      return (
                        <td key={type} className={`${divider}px-4 py-3 align-top`}>
                          <div className="group relative flex min-w-48 flex-col gap-0.5">
                            <p className="line-clamp-2 text-xs break-words text-foreground">{preview}</p>
                            <button
                              type="button"
                              aria-label={`Expand ${signalTypeLabel(type)} signal`}
                              onClick={(e) => {
                                // Anchor to the cell, not the icon, so the panel
                                // opens under the column rather than beside it.
                                const td = e.currentTarget.closest("td") ?? e.currentTarget
                                const r = td.getBoundingClientRect()
                                setOpen({
                                  accountId: account.account_id,
                                  name: account.hospital_name,
                                  type,
                                  items: cell,
                                  anchorEl: td,
                                  anchor: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
                                })
                              }}
                              className="absolute top-0 right-0 rounded-md border bg-card p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                            >
                              <Expand className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Showing {start}-{end} of {total.toLocaleString()} accounts
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border px-3 py-1 font-medium outline-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount || loading}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-lg border px-3 py-1 font-medium outline-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <SignalListPopover
          key={`${open.accountId}::${open.type}`}
          accountName={open.name}
          signalType={open.type}
          items={open.items}
          anchorEl={open.anchorEl}
          anchor={open.anchor}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
