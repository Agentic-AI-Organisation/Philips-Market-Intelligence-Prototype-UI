"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { AccountsTable } from "@/components/accounts/accounts-table"
import { AccountDetailPage } from "@/components/account-intelligence/account-detail-page"
import { RoleProvider } from "@/lib/role-context"
import { AccountProvider, useAccountContext } from "@/lib/account-context"

// The Accounts tab's own two sub-views (table vs. a specific account) —
// not a router, just local state, since Home (see app-shell.tsx) never
// navigates anywhere yet.
function AccountsScreen() {
  const { setSelectedAccountId } = useAccountContext()
  const [view, setView] = useState<"table" | "detail">("table")

  function openAccount(accountId: string) {
    setSelectedAccountId(accountId)
    setView("detail")
  }

  return view === "table" ? (
    <AccountsTable onSelectAccount={openAccount} />
  ) : (
    <AccountDetailPage onBack={() => setView("table")} />
  )
}

export default function Page() {
  return (
    <RoleProvider>
      <AccountProvider>
        <AppShell>
          <AccountsScreen />
        </AppShell>
      </AccountProvider>
    </RoleProvider>
  )
}
