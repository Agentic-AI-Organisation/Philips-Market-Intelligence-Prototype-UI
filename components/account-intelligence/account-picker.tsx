"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Building2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAccountContext } from "@/lib/account-context"

export function AccountPicker() {
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccountContext()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedName = accounts.find((a) => a.account_id === selectedAccountId)?.hospital_name ?? null

  const filtered = useMemo(
    () => accounts.filter((a) => a.hospital_name.toLowerCase().includes(search.trim().toLowerCase())),
    [accounts, search],
  )

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-72">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={accounts.length === 0}
        className="flex w-full items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {isOpen ? (
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search accounts…"
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <span className={cn("min-w-0 flex-1 truncate text-sm", selectedName ? "font-semibold" : "text-muted-foreground")}>
            {accounts.length === 0 ? "No accounts found" : (selectedName ?? "Search accounts…")}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border bg-popover shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No accounts found</li>}
            {filtered.map((account) => (
              <li key={account.account_id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(account.account_id)
                    setIsOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "block w-full truncate px-3 py-2 text-left text-sm",
                    account.account_id === selectedAccountId ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  {account.hospital_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
