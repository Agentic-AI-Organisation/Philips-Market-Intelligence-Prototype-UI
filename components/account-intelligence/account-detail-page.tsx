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
  const { selectedAccount, isLoading } = useAccountContext()

  if (isLoading || !selectedAccount) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Accounts
      </button>

      <AccountHeader account={selectedAccount} />

      {/* Underline tabs mark this as the page's top-level section switcher —
          deliberately a different visual language from the filled-pill
          segmented control ResearchInsightsPage uses for its own research-area
          sub-navigation below, so the two levels don't read as peers. */}
      <div className="flex gap-6 overflow-x-auto border-b">
        {OUTER_TABS.map((tab) => {
          const disabled = tab.id !== "intelligence"
          const active = tab.id === "intelligence"
          return (
            <button
              key={tab.id}
              disabled={disabled}
              title={disabled ? "Coming soon" : undefined}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-0.5 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "border-primary text-foreground"
                  : disabled
                    ? "cursor-not-allowed border-transparent text-muted-foreground/50"
                    : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {disabled && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </div>

      <ResearchInsightsPage />
    </div>
  )
}
