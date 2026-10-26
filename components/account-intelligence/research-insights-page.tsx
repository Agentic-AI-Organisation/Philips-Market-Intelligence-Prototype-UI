"use client"

import { useState } from "react"
import { PlayCircle } from "lucide-react"
import { toast } from "sonner"
import { useAccountContext } from "@/lib/account-context"
import { researchAreaLabel, useModelConfig } from "@/lib/use-admin-data"
import { useGroupOutput, useGroupSummary, useResearchRun } from "@/lib/use-research-data"
import { CategoryCard, hasCategoryData } from "./output-renderer"
import { SummaryPanel } from "./summary-panel"
import { PanelChat } from "./panel-chat"

const META_KEYS = new Set(["sources", "recommended_research_frequency"])

export function ResearchInsightsPage() {
  const { selectedAccountId, selectedAccount, isLoading: accountsLoading } = useAccountContext()
  const { researchAreas, isLoading: areasLoading } = useModelConfig()
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined)

  const groupId = activeGroupId ?? researchAreas[0]?.research_group_id
  const activeGroup = researchAreas.find((g) => g.research_group_id === groupId)

  const {
    data: entry,
    error: outputError,
    isLoading: outputLoading,
    mutate: refreshOutput,
  } = useGroupOutput(selectedAccountId, groupId)
  const { data: summaryEntry, mutate: refreshSummary } = useGroupSummary(selectedAccountId, groupId)
  const {
    status: serverStatus,
    isRunning,
    alreadyRunning,
    error: runError,
    runNow: triggerRun,
  } = useResearchRun(selectedAccountId, groupId, () => {
    refreshOutput()
    refreshSummary()
    toast.success("Research complete", { description: "Findings have been refreshed." })
  })

  async function runNow() {
    await triggerRun()
  }

  const error = runError ?? (outputError ? (outputError instanceof Error ? outputError.message : "Failed to load research output") : null)

  if (accountsLoading || !selectedAccountId || !selectedAccount) {
    return <p className="text-sm text-muted-foreground">Loading accounts…</p>
  }

  if (areasLoading || !groupId) {
    return <p className="text-sm text-muted-foreground">Loading requirement groups…</p>
  }

  const cards = entry?.data
    ? Object.entries(entry.data).filter(([key, value]) => !META_KEYS.has(key) && hasCategoryData(value))
    : []

  return (
    <>
      <div className="space-y-5 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 sm:p-5">
        <div
          role="tablist"
          aria-label="Research areas within Intelligence"
          className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-1.5"
        >
          {researchAreas.map((g) => (
            <button
              key={g.research_group_id}
              role="tab"
              aria-selected={groupId === g.research_group_id}
              onClick={() => setActiveGroupId(g.research_group_id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                groupId === g.research_group_id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {researchAreaLabel(g.name, g.research_group_id)}
            </button>
          ))}
        </div>

        <div className="flex items-start justify-between rounded-xl border bg-card p-5">
          <div>
            <h2 className="text-base font-semibold">{activeGroup ? researchAreaLabel(activeGroup.name, activeGroup.research_group_id) : ""}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isRunning
                  ? alreadyRunning
                    ? "A research run is already in progress for this account…"
                    : "Research run in progress…"
                  : entry?.generated_at
                  ? `Last refreshed on ${new Date(entry.generated_at).toLocaleString()}`
                  : serverStatus?.last_run_timestamp
                    ? `Last refreshed on ${new Date(serverStatus.last_run_timestamp).toLocaleString()}`
                    : "Never run for this account"}
              </span>
            </div>
          </div>
          <button
            onClick={runNow}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <PlayCircle className="size-4" aria-hidden="true" />
            {isRunning ? "Running…" : "Run now"}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {summaryEntry !== undefined && <SummaryPanel entry={summaryEntry} />}

        {outputLoading || (entry === undefined && !outputError) ? (
          <p className="text-sm text-muted-foreground">Loading research output…</p>
        ) : cards.length === 0 && !outputError ? (
          <p className="text-sm text-muted-foreground">No research findings yet for this account and requirement group.</p>
        ) : cards.length === 0 ? null : (
          <div className="grid grid-cols-1 gap-4">
            {cards.map(([key, value]) => (
              <CategoryCard key={key} id={`topic-${key}`} title={researchAreaLabel(key, key)} value={value} />
            ))}
          </div>
        )}
      </div>

      <PanelChat />
    </>
  )
}
