"use client"

import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAccountContext } from "@/lib/account-context"
import { AccountHeader } from "./account-header"
import { ResearchInsightsPage } from "./research-insights-page"

// Only Intelligence is wired up - the rest are placeholders for features
// coming later (see the Home tab in app-shell.tsx for the same treatment).
const OUTER_TABS = [
  { id: "intelligence", label: "Intelligence" },
  { id: "opportunities", label: "Opportunities" },
  { id: "contacts", label: "Contacts" },
  { id: "documents", label: "Documents" },
] as const

export function AccountDetailPage({ onBack }: { onBack: () => void }) {
  const { selectedAccount, selectedAccountId, isLoading } = useAccountContext()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>
  }

  if (!selectedAccountId || !selectedAccount) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3">
        <BackToAccounts onBack={onBack} />
        <p className="text-sm text-muted-foreground">Account not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <BackToAccounts onBack={onBack} />

      <AccountHeader
        account={selectedAccount}
        tabs={
          <div role="tablist" aria-label="Account sections" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {OUTER_TABS.map((tab) => {
              const active = tab.id === "intelligence"
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-disabled={!active || undefined}
                  title={active ? undefined : "Coming soon"}
                  className={cn(
                    "-mb-px border-b-2 py-2 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "border-primary font-semibold text-foreground"
                      : "cursor-not-allowed border-transparent font-medium text-muted-foreground/60",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        }
      />

      <ResearchInsightsPage />
    </div>
  )
}

function BackToAccounts({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to Accounts
    </button>
  )
}
