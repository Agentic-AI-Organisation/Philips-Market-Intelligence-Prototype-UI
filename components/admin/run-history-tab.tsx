"use client"

import { ChevronDown, ChevronLeft, ChevronRight, History } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { JobStatus, TriggerType } from "@/lib/types"
import { formatUtc } from "@/lib/schedule-time"
import { researchAreaLabel, useAccounts, useModelConfig, useRunHistory } from "@/lib/use-admin-data"
import { SearchableSelect } from "./searchable-select"

const PAGE_SIZE = 100
const ALL = "__all__"

const TRIGGER_OPTIONS: { value: TriggerType | typeof ALL; label: string }[] = [
  { value: ALL, label: "All" },
  { value: "on_demand", label: "On demand" },
  { value: "scheduled", label: "Scheduled" },
]

const DAYS_OPTIONS: { label: string; days: number | undefined }[] = [
  { label: "Past 3 days", days: 3 },
  { label: "This week", days: 7 },
  { label: "Last 2 weeks", days: 14 },
  { label: "This month", days: 30 },
  { label: "All time", days: undefined },
]

const STATUS_META: Record<JobStatus, { label: string; classes: string; dot: string }> = {
  queued: { label: "Queued", classes: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  processing: { label: "Processing", classes: "bg-blue-50 text-blue-700", dot: "bg-blue-600" },
  in_progress: { label: "In progress", classes: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  completed: { label: "Completed", classes: "bg-success/10 text-success", dot: "bg-success" },
  failed: { label: "Failed", classes: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  dead_letter: { label: "Dead letter", classes: "bg-violet-50 text-violet-700", dot: "bg-violet-600" },
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "—"
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (Number.isNaN(ms) || ms < 0) return "—"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function RunHistoryTab() {
  const [trigger, setTrigger] = useState<TriggerType | typeof ALL>(ALL)
  const [days, setDays] = useState<number | undefined>(undefined)
  const [accountId, setAccountId] = useState(ALL)
  const [researchGroupId, setResearchGroupId] = useState(ALL)
  const [page, setPage] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { accounts, accountsById } = useAccounts()
  const { researchAreas, researchAreasById } = useModelConfig()

  const params = {
    trigger_type: trigger === ALL ? undefined : trigger,
    days,
    account_id: accountId === ALL ? undefined : accountId,
    research_group_id: researchGroupId === ALL ? undefined : researchGroupId,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }
  const { data: rows, error, isLoading } = useRunHistory(params)
  const hasNextPage = (rows?.length ?? 0) === PAGE_SIZE

  const accountOptions = useMemo(
    () => [
      { value: ALL, label: "All accounts" },
      ...accounts.map((a) => ({
        value: a.account_id,
        label: a.hospital_name,
        hint: a.account_id,
        keywords: [a.account_id],
      })),
    ],
    [accounts],
  )

  const areaOptions = useMemo(
    () => [
      { value: ALL, label: "All research areas" },
      ...researchAreas.map((r) => ({
        value: r.research_group_id,
        label: researchAreaLabel(r.name, r.research_group_id),
      })),
    ],
    [researchAreas],
  )

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v)
      setPage(0)
      setExpandedIds(new Set())
    }

  function toggleExpanded(jobId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  return (
    <section aria-labelledby="run-history-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 id="run-history-heading" className="font-semibold">
            Run history
          </h2>
          <p className="text-xs text-muted-foreground">
            Every on-demand and scheduled research run, newest first. Status reflects the job&apos;s
            internal lifecycle for debugging and auditing purposes.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchableSelect
            aria-label="Filter by account"
            value={accountId}
            onChange={resetPage(setAccountId)}
            options={accountOptions}
            placeholder="All accounts"
            searchPlaceholder="Search accounts or IDs…"
            emptyText="No accounts found."
            className="md:w-72"
          />
          <SearchableSelect
            aria-label="Filter by research area"
            value={researchGroupId}
            onChange={resetPage(setResearchGroupId)}
            options={areaOptions}
            placeholder="All research areas"
            searchPlaceholder="Search research areas…"
            emptyText="No research areas found."
            className="md:w-64"
          />
          <div
            role="radiogroup"
            aria-label="Trigger type"
            className="flex h-9 items-center gap-0.5 rounded-lg bg-muted p-0.5 md:ml-auto"
          >
            {TRIGGER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={trigger === option.value}
                onClick={() => resetPage(setTrigger)(option.value)}
                className={cn(
                  "h-full flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring md:flex-none",
                  trigger === option.value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div role="radiogroup" aria-label="Time window" className="flex flex-wrap gap-1.5">
          {DAYS_OPTIONS.map((option) => {
            const active = days === option.days || (days === undefined && option.days === undefined)
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => resetPage(setDays)(option.days)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {error && !rows?.length ? (
          <p role="alert" className="px-6 py-12 text-center text-sm text-destructive">
            {"Couldn't load run history. "}
            {error instanceof Error ? error.message : ""}
          </p>
        ) : !isLoading && rows?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <History className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">No runs match these filters</p>
              <p className="text-xs text-muted-foreground">Try a wider time window or different filters.</p>
            </div>
          </div>
        ) : (
          <Table className="min-w-[1020px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Triggered at</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Research area</TableHead>
                <TableHead>Trigger type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Triggered by</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Error details</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !rows
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j} className="py-4 first:pl-4">
                          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows?.map((row) => {
                    const account = accountsById.get(row.account_id)
                    const expanded = expandedIds.has(row.job_id)
                    const meta = STATUS_META[row.status]
                    return (
                      <Fragment key={row.job_id}>
                        <TableRow>
                          <TableCell className="py-3 pl-4">{formatUtc(row.created_at)}</TableCell>
                          <TableCell>
                            <span className="flex flex-col gap-0.5">
                              <span className="max-w-56 truncate font-medium">
                                {account?.hospital_name ?? row.account_id}
                              </span>
                              <span className="text-xs text-muted-foreground">{row.account_id}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                              {researchAreaLabel(
                                researchAreasById.get(row.research_group_id)?.name,
                                row.research_group_id,
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                row.trigger_type === "on_demand"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {row.trigger_type === "on_demand" ? "On demand" : "Scheduled"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                meta.classes,
                              )}
                            >
                              <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                              {meta.label}
                            </span>
                          </TableCell>
                          <TableCell>{formatDuration(row.started_at, row.completed_at)}</TableCell>
                          <TableCell>
                            <span className="block max-w-48 truncate" title={row.triggered_by}>
                              {row.triggered_by}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4">
                            {row.error_message ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => toggleExpanded(row.job_id)}
                                aria-expanded={expanded}
                                aria-label={`Error details for run ${row.job_id}`}
                              >
                                <ChevronDown
                                  aria-hidden="true"
                                  className={cn("transition-transform", expanded && "rotate-180")}
                                />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                        {expanded && row.error_message && (
                          <TableRow className="bg-destructive/5 hover:bg-destructive/5">
                            <TableCell colSpan={8} className="py-3 pl-4 whitespace-normal">
                              <p className="mb-1 text-xs font-medium text-destructive">Error</p>
                              <p className="text-sm whitespace-pre-wrap">{row.error_message}</p>
                              {row.started_at && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {`Started ${formatUtc(row.started_at)}`}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {row.completed_at ? `Finished ${formatUtc(row.completed_at)}` : "Never finished"}
                                {" · "}
                                <span className="font-mono">{row.job_id}</span>
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {rows && rows.length > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + rows.length}`
              : "No results"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft data-icon="inline-start" aria-hidden="true" />
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
