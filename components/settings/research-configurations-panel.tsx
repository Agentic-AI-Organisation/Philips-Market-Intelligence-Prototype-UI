"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import { SchedulesTab } from "@/components/admin/schedules-tab"
import { ModelConfigTab } from "@/components/admin/model-config-tab"
import { RunHistoryTab } from "@/components/admin/run-history-tab"
import { NoAccess } from "@/components/admin/no-access"

const TABS = [
  { id: "schedules", label: "Schedules" },
  { id: "model-config", label: "Model config" },
  { id: "run-history", label: "Run history" },
] as const

type TabId = (typeof TABS)[number]["id"]

// Settings > Research configurations (source: pages/ResearchScheduling.tsx).
// Three tabs in the source's order: Schedules, Model config, Run history.
export function ResearchConfigurationsPanel() {
  const [tab, setTab] = useState<TabId>("schedules")
  const { isAdmin } = useRole()

  if (!isAdmin) return <NoAccess />

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        role="tablist"
        aria-label="Scheduling sections"
        className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "schedules" && <SchedulesTab />}
        {tab === "model-config" && <ModelConfigTab />}
        {tab === "run-history" && <RunHistoryTab />}
      </div>
    </div>
  )
}
