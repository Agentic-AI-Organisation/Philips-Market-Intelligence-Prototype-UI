"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAccountContext } from "@/lib/account-context"
import { latestSignalDate, signalsFor, SIGNAL_TYPES, useSignals } from "@/lib/use-signals-data"
import { SignalCell } from "./signal-cell"

const PAGE_SIZE = 20

interface AccountsTableProps {
  onSelectAccount: (accountId: string) => void
}

export function AccountsTable({ onSelectAccount }: AccountsTableProps) {
  const { accounts, isLoading: accountsLoading } = useAccountContext()
  const { signals, isLoading: signalsLoading } = useSignals()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  // Accounts with recent signal activity surface first - with ~2,100
  // accounts and only a handful having any signals today, a plain
  // alphabetical default would bury every one of them on later pages.
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? accounts.filter((a) => a.hospital_name.toLowerCase().includes(q)) : accounts
    return [...filtered].sort((a, b) => {
      const dateA = latestSignalDate(signals, a.account_id)
      const dateB = latestSignalDate(signals, b.account_id)
      if (dateA && !dateB) return -1
      if (!dateA && dateB) return 1
      if (dateA && dateB && dateA !== dateB) return dateA > dateB ? -1 : 1
      return a.hospital_name.localeCompare(b.hospital_name)
    })
  }, [accounts, signals, search])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length)

  if (accountsLoading) {
    return <p className="text-sm text-muted-foreground">Loading accounts…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Recent sales-relevant signals across every account — accounts with new activity are shown first.
          </p>
        </div>
        <div className="relative w-full max-w-72 shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search accounts…"
            className="bg-card pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48">Account</TableHead>
              {SIGNAL_TYPES.map((t) => (
                <TableHead key={t.type} className="min-w-56">
                  {t.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={SIGNAL_TYPES.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                  No accounts match &ldquo;{search}&rdquo;.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((account) => (
                <TableRow key={account.account_id}>
                  <TableCell className="whitespace-normal align-top">
                    <button
                      onClick={() => onSelectAccount(account.account_id)}
                      className="text-left font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {account.hospital_name}
                    </button>
                  </TableCell>
                  {SIGNAL_TYPES.map((t) => (
                    <TableCell key={t.type} className="whitespace-normal align-top">
                      <SignalCell entries={signalsFor(signals, account.account_id, t.type)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{signalsLoading ? "Loading signals…" : `Showing ${rangeStart}–${rangeEnd} of ${sorted.length} accounts`}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
