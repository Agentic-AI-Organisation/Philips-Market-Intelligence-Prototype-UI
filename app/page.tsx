"use client"

import { useState } from "react"
import { AppShell, type TopLevelScreen } from "@/components/app-shell"
import { AccountsTable } from "@/components/accounts/accounts-table"
import { AccountDetailPage } from "@/components/account-intelligence/account-detail-page"
import { SettingsPage } from "@/components/settings/settings-page"
import { RoleProvider } from "@/lib/role-context"
import { AccountProvider, useAccountContext } from "@/lib/account-context"
import { ChatStoreProvider } from "@/lib/chat-store-context"

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

function AppContent() {
  const [screen, setScreen] = useState<TopLevelScreen>("accounts")

  return (
    <AppShell activeScreen={screen} onNavigate={setScreen}>
      {screen === "settings" ? <SettingsPage /> : <AccountsScreen />}
    </AppShell>
  )
}

export default function Page() {
  return (
    <RoleProvider>
      <AccountProvider>
        <ChatStoreProvider>
          <AppContent />
        </ChatStoreProvider>
      </AccountProvider>
    </RoleProvider>
  )
}
