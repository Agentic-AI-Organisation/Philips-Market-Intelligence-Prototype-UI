"use client"

import { createContext, useContext, useEffect, useState } from "react"
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

// Mirrors itaap-commercialit-account-intelligence-ui's ClientContext —
// one account selected at a time, shared across the whole app (the account
// picker lives in the shared header, same as the real Topbar).
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { accounts, isLoading } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) setSelectedAccountId(accounts[0].account_id)
  }, [accounts, selectedAccountId])

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
