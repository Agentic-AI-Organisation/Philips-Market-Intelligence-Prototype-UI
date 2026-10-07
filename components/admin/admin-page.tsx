"use client"

import { useState } from "react"
import { CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useModelConfig } from "@/lib/use-admin-data"
import { ApiError } from "@/lib/types"
import { SchedulesTab } from "./schedules-tab"
import { ModelConfigTab } from "./model-config-tab"
import { RunHistoryTab } from "./run-history-tab"
import { NoAccess } from "./no-access"

const TABS = [
  { id: "schedules", label: "Schedules" },
  { id: "model-config", label: "Model config" },
  { id: "run-history", label: "Run history" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function AdminPage() {
  const [tab, setTab] = useState<TabId>("schedules")
  const { error } = useModelConfig()

  if (error instanceof ApiError && error.status === 401) return <NoAccess />

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <section className="flex items-center gap-4 rounded-xl border bg-card p-5">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarClock className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Research scheduling</h1>
          <p className="text-sm text-muted-foreground">
            Automate research runs per account and choose the model each research area uses.
          </p>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
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
