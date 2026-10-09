"use client"

import { AppShell } from "@/components/app-shell"
import { ResearchInsightsPage } from "@/components/account-intelligence/research-insights-page"
import { RoleProvider } from "@/lib/role-context"
import { AccountProvider } from "@/lib/account-context"

export default function Page() {
  return (
    <RoleProvider>
      <AccountProvider>
        <AppShell>
          <ResearchInsightsPage />
        </AppShell>
      </AccountProvider>
    </RoleProvider>
  )
}
