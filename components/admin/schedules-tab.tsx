"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as api from "@/lib/mock-api"
import { ApiError, type ScheduleConfig, type StatusFilter } from "@/lib/types"
import {
  researchAreaLabel,
  useAccounts,
  useModelConfig,
  useRevalidateSchedules,
  useSchedules,
} from "@/lib/use-admin-data"
import { accessDeniedMessage, isAccessDenied } from "@/lib/admin-roles"
import { SearchableSelect } from "./searchable-select"
import { ScheduleTable } from "./schedule-table"
import { ScheduleFormSheet } from "./schedule-form-sheet"
import { ScheduleDetailsSheet } from "./schedule-details-sheet"
import { ConfirmDialog } from "./confirm-dialog"
import { Cadence } from "./schedule-bits"

const PAGE_SIZE = 20
const ALL = "__all__"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "enabled", label: "Enabled" },
  { value: "paused", label: "Paused" },
  { value: "all", label: "All" },
]

export function SchedulesTab() {
  const [accountId, setAccountId] = useState(ALL)
  const [researchGroupId, setResearchGroupId] = useState(ALL)
  const [status, setStatus] = useState<StatusFilter>("enabled")
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleConfig | null>(null)
  const [detailsRow, setDetailsRow] = useState<ScheduleConfig | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [confirmToggle, setConfirmToggle] = useState<{ row: ScheduleConfig; enabled: boolean } | null>(null)

  const { accounts, accountsById } = useAccounts()
  const { researchAreas, researchAreasById } = useModelConfig()
  const revalidate = useRevalidateSchedules()

  const params = {
    account_id: accountId === ALL ? undefined : accountId,
    research_group_id: researchGroupId === ALL ? undefined : researchGroupId,
    status,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }
  const { data: rows, isLoading, error } = useSchedules(params)
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

  const areaItems = useMemo(
    () => [
      { value: ALL, label: "All research areas" },
      ...researchAreas.map((r) => ({
        value: r.research_group_id,
        label: researchAreaLabel(r.name, r.research_group_id),
      })),
    ],
    [researchAreas],
  )

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: ScheduleConfig) {
    setDetailsRow(null)
    setEditing(row)
    setFormOpen(true)
  }

  async function showConflicting(row: Pick<ScheduleConfig, "account_id" | "research_group_id">) {
    try {
      const [existing] = await api.listSchedules({
        account_id: row.account_id,
        research_group_id: row.research_group_id,
        status: "enabled",
        limit: 1,
        offset: 0,
      })
      if (existing) {
        setFormOpen(false)
        setDetailsRow(existing)
      }
    } catch {
      // Toast already explains the conflict; viewing is best-effort.
    }
  }

  async function toggleEnabled(row: ScheduleConfig, enabled: boolean) {
    // Every status change goes through the confirm dialog first.
    setConfirmToggle({ row, enabled })
  }

  async function doToggle(row: ScheduleConfig, enabled: boolean) {
    setPendingIds((prev) => new Set(prev).add(row.id))
    try {
      const updated = enabled ? await api.enableSchedule(row.id) : await api.disableSchedule(row.id)
      setDetailsRow((current) => (current?.id === updated.id ? updated : current))
      if (enabled) {
        toast.success("Schedule resumed")
      } else {
        toast.success("Schedule paused", {
          description: "No further runs will start until it’s resumed.",
        })
      }
      await revalidate()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Can't resume this schedule", {
          description:
            "Another schedule for this account and research area is already enabled. Pause it first.",
          action: { label: "View it", onClick: () => showConflicting(row) },
        })
      } else if (isAccessDenied(err)) {
        toast.error("You don't have admin access", { description: accessDeniedMessage() })
      } else {
        toast.error("Couldn't update schedule", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  return (
    <section aria-labelledby="schedules-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="schedules-heading" className="font-semibold">
              Schedules
            </h2>
            <p className="text-xs text-muted-foreground">
              One active schedule per account and research area.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New schedule
          </Button>
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
            options={areaItems}
            placeholder="All research areas"
            searchPlaceholder="Search research areas…"
            emptyText="No research areas found."
            className="md:w-64"
          />

          <div
            role="radiogroup"
            aria-label="Status"
            className="flex h-9 items-center gap-0.5 rounded-lg bg-muted p-0.5 md:ml-auto"
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={status === option.value}
                onClick={() => resetPage(setStatus)(option.value)}
                className={cn(
                  "h-full flex-1 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring md:flex-none",
                  status === option.value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <ScheduleTable
          rows={rows ?? []}
          isLoading={isLoading && !rows}
          error={error}
          accountsById={accountsById}
          researchAreasById={researchAreasById}
          pendingIds={pendingIds}
          onToggle={toggleEnabled}
          onEdit={openEdit}
          onDetails={setDetailsRow}
          emptyAction={
            <Button variant="outline" onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              New schedule
            </Button>
          }
          statusFilter={status}
        />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {rows && rows.length > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + rows.length}`
              : "No results"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft data-icon="inline-start" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <ScheduleFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={async () => {
          await revalidate()
        }}
        onRefresh={async () => {
          await revalidate()
        }}
      />

      <ScheduleDetailsSheet
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
        accountsById={accountsById}
        researchAreasById={researchAreasById}
        pending={detailsRow ? pendingIds.has(detailsRow.id) : false}
        onEdit={openEdit}
        onToggle={toggleEnabled}
      />

      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.enabled ? "Resume schedule?" : "Pause schedule?"}
        confirmLabel={confirmToggle?.enabled ? "Resume schedule" : "Pause schedule"}
        onCancel={() => setConfirmToggle(null)}
        onConfirm={() => {
          if (!confirmToggle) return
          const { row, enabled } = confirmToggle
          setConfirmToggle(null)
          void doToggle(row, enabled)
        }}
      >
        {confirmToggle && (
          <div className="flex flex-col gap-2">
            <p>
              <span className="font-medium text-foreground">
                {accountsById.get(confirmToggle.row.account_id)?.hospital_name ?? confirmToggle.row.account_id}
              </span>{" "}
              ·{" "}
              {researchAreaLabel(
                researchAreasById.get(confirmToggle.row.research_group_id)?.name,
                confirmToggle.row.research_group_id,
              )}
            </p>
            <Cadence row={confirmToggle.row} />
            <p className="text-muted-foreground">
              {confirmToggle.enabled
                ? "Picks up from the next scheduled time — missed runs aren't re-run."
                : "Stops refreshing until resumed."}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  )
}
