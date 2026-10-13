"use client"

import { createContext, useContext, useState } from "react"
import { useAccounts } from "./use-admin-data"
import type { Account } from "./types"

interface AccountContextValue {
  accounts: Account[]
  selectedAccountId: string | null
  selectedAccount: Account | null
  setSelectedAccountId: (accountId: string) => void
  isLoading: boolean
}

const AccountContext = createContext<AccountContextValue | null>(null)

// One account selected at a time, shared across the whole app. Unlike the
// old dropdown-based nav, nothing is auto-selected on load — the Accounts
// table is the landing view, and selectedAccountId stays null until the
// user clicks an account row (see app/page.tsx).
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { accounts, isLoading } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const selectedAccount = accounts.find((a) => a.account_id === selectedAccountId) ?? null

  return (
    <AccountContext.Provider value={{ accounts, selectedAccountId, selectedAccount, setSelectedAccountId, isLoading }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccountContext() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error("useAccountContext must be used inside AccountProvider")
  return ctx
}
