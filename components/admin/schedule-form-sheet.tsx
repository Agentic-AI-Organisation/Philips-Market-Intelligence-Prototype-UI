"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarClock, Info, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import * as api from "@/lib/mock-api"
import {
  type BulkCreateItemResult,
  type FrequencyType,
  type ScheduleConfig,
  type UpdateSchedulePayload,
} from "@/lib/types"
import {
  SCHEDULING_TIMEZONES,
  WEEKDAYS,
  computeNextRunAt,
  defaultTimezone,
  formatInZone,
  formatRelative,
  formatUtc,
  ordinal,
  shortDay,
  sortDays,
  zoneAbbreviation,
} from "@/lib/schedule-time"
import { adminErrorMessage } from "@/lib/admin-roles"
import {
  researchAreaLabel,
  useAccounts,
  useModelConfig,
  useScheduleCoverage,
  useUnscheduledAccounts,
} from "@/lib/use-admin-data"
import { SearchableSelect } from "./searchable-select"
import { AccountMultiPicker } from "./account-multi-picker"
import { ConfirmDialog } from "./confirm-dialog"

interface ScheduleFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ScheduleConfig | null
  onSaved: () => Promise<void> | void
  onRefresh: () => Promise<void> | void
}

export function ScheduleFormSheet({ open, onOpenChange, editing, onSaved, onRefresh }: ScheduleFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full gap-0 p-0 data-[side=right]:w-full",
          editing ? "data-[side=right]:sm:max-w-lg" : "data-[side=right]:sm:max-w-2xl data-[side=right]:xl:max-w-3xl",
        )}
      >
        {open && (
          <ScheduleForm
            key={editing?.id ?? "new"}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onRefresh={onRefresh}
            onSaved={async () => {
              await onSaved()
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface Draft {
  research_group_id: string
  frequency_type: FrequencyType
  days_of_week: string[]
  day_of_month: string
  interval_days: string
  time: string
  timezone: string
}

// Custom intervals aren't offered on create/edit — daily, weekly, and
// monthly cover it. (Legacy custom_interval rows still render via
// describeFrequency, and still show their interval field below if you open
// one for editing — there just isn't a button to switch back into it.)
const FORM_FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function draftFromRow(row: ScheduleConfig | null): Draft {
  return {
    research_group_id: row?.research_group_id ?? "",
    frequency_type: row?.frequency_type ?? "weekly",
    // Weekly is single-day only going forward — a legacy multi-day row is
    // truncated to its first day rather than rejected outright.
    days_of_week: row?.days_of_week?.split(",").filter(Boolean).slice(0, 1) ?? ["monday"],
    day_of_month: row?.day_of_month?.toString() ?? "1",
    interval_days: row?.interval_days?.toString() ?? "7",
    time: row?.time_of_day.slice(0, 5) ?? "06:00",
    timezone: defaultTimezone(row?.timezone),
  }
}

type CadenceFields = Pick<
  ScheduleConfig,
  "frequency_type" | "days_of_week" | "day_of_month" | "interval_days" | "time_of_day" | "timezone"
>

function toCadence(draft: Draft): CadenceFields {
  const f = draft.frequency_type
  return {
    frequency_type: f,
    days_of_week: f === "weekly" ? sortDays(draft.days_of_week).join(",") : null,
    day_of_month: f === "monthly" ? Number(draft.day_of_month) : null,
    interval_days: f === "custom_interval" ? Number(draft.interval_days) : null,
    time_of_day: `${draft.time}:00`,
    timezone: draft.timezone,
  }
}

type Errors = Partial<Record<keyof Draft | "account_ids", string>>

const TARGET_KEYS = new Set(["account_ids", "research_group_id"])

function validate(draft: Draft, selectedCount: number, isEdit: boolean): Errors {
  const errors: Errors = {}
  if (!isEdit && !draft.research_group_id) errors.research_group_id = "Choose a research area."
  if (!isEdit && draft.research_group_id && selectedCount === 0)
    errors.account_ids = "Select at least one account."
  if (draft.frequency_type === "weekly" && draft.days_of_week.length === 0)
    errors.days_of_week = "Pick at least one day."
  if (draft.frequency_type === "monthly") {
    const dom = Number(draft.day_of_month)
    if (!Number.isInteger(dom) || dom < 1 || dom > 28)
      errors.day_of_month = "Use a day between 1 and 28 so it runs every month."
  }
  if (draft.frequency_type === "custom_interval") {
    const n = Number(draft.interval_days)
    if (!Number.isInteger(n) || n < 1) errors.interval_days = "Must be a whole number, 1 or more."
  }
  if (!/^\d{2}:\d{2}$/.test(draft.time)) errors.time = "Enter a time."
  if (!draft.timezone) errors.timezone = "Choose a timezone."
  return errors
}

function ScheduleForm({
  editing,
  onCancel,
  onRefresh,
  onSaved,
}: {
  editing: ScheduleConfig | null
  onCancel: () => void
  onRefresh: () => Promise<void> | void
  onSaved: () => Promise<void>
}) {
  const isEdit = editing !== null
  const [draft, setDraft] = useState<Draft>(() => draftFromRow(editing))
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(() => new Set())
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [failedItems, setFailedItems] = useState<BulkCreateItemResult[]>([])
  const [requestedCount, setRequestedCount] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { accounts, accountsById } = useAccounts()
  const { researchAreas, researchAreasById } = useModelConfig()
  const { coverage, isLoading: coverageLoading } = useScheduleCoverage()

  const scheduledInArea = draft.research_group_id ? coverage.get(draft.research_group_id) : undefined

  // The account picker is a live query: fetch accounts with no enabled
  // schedule for the picked research area, right after the area is picked.
  const {
    data: unscheduledData,
    error: unscheduledError,
    isLoading: unscheduledLoading,
  } = useUnscheduledAccounts(isEdit || !draft.research_group_id ? null : draft.research_group_id)
  const unscheduled = useMemo(() => unscheduledData ?? [], [unscheduledData])
  const unscheduledById = useMemo(() => new Map(unscheduled.map((a) => [a.account_id, a])), [unscheduled])

  // Drop anything selected that is no longer schedulable.
  useEffect(() => {
    if (!unscheduledData) return
    setSelectedAccounts((prev) => {
      const kept = [...prev].filter((id) => unscheduledById.has(id))
      return kept.length === prev.size ? prev : new Set(kept)
    })
  }, [unscheduledData, unscheduledById])

  const errors = validate(draft, selectedAccounts.size, isEdit)
  const visibleErrors = showErrors ? errors : {}
  const cadence = toCadence(draft)
  const cadenceValid = Object.keys(errors).every((k) => TARGET_KEYS.has(k))
  const nextRun = cadenceValid ? computeNextRunAt(cadence) : null

  const changes = useMemo<UpdateSchedulePayload>(() => {
    if (!editing) return {}
    const original: CadenceFields = {
      frequency_type: editing.frequency_type,
      days_of_week: editing.days_of_week,
      day_of_month: editing.day_of_month,
      interval_days: editing.interval_days,
      time_of_day: editing.time_of_day,
      timezone: editing.timezone,
    }
    const diff: UpdateSchedulePayload = {}
    for (const key of Object.keys(cadence) as (keyof CadenceFields)[]) {
      if (cadence[key] !== original[key]) Object.assign(diff, { [key]: cadence[key] })
    }
    return diff
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, JSON.stringify(cadence)])
  const hasChanges = !isEdit || Object.keys(changes).length > 0

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setServerError(null)
  }

  function selectArea(areaId: string) {
    if (areaId === draft.research_group_id) return
    // Selection is per research area — switching areas starts fresh.
    setSelectedAccounts(new Set())
    setFailedItems([])
    update("research_group_id", areaId)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (Object.keys(errors).length > 0 || !hasChanges) return
    if (!editing) {
      setConfirmOpen(true)
      return
    }
    await doSubmit()
  }

  async function doSubmit() {
    setSubmitting(true)
    setServerError(null)
    setFailedItems([])
    try {
      if (editing) {
        await api.updateSchedule(editing.id, changes)
        toast.success("Schedule updated")
      } else {
        const response = await api.createSchedulesBulk({
          account_ids: [...selectedAccounts],
          research_group_id: draft.research_group_id,
          ...cadence,
        })
        const failed = response.results.filter((r) => r.status !== "created")
        const createdCount = response.results.length - failed.length
        const plural = (n: number) => `${n.toLocaleString()} ${n === 1 ? "schedule" : "schedules"}`
        if (failed.length === 0) {
          toast.success(`Created ${plural(createdCount)}`)
        } else {
          // Partial (or total) failure is normal — stay open and list the
          // accounts that didn't get a row so they can be retried.
          setFailedItems(failed)
          setRequestedCount(response.results.length)
          const conflicts = failed.filter((r) => r.status === "conflict").length
          const missing = failed.filter((r) => r.status === "account_not_found").length
          const parts = [
            conflicts > 0 ? `${conflicts} already scheduled` : null,
            missing > 0 ? `${missing} account${missing === 1 ? "" : "s"} not found` : null,
          ].filter(Boolean)
          toast.warning(`Created ${createdCount} of ${response.results.length}`, {
            description: parts.join(" · "),
          })
          await onRefresh()
          return
        }
      }
      await onSaved()
    } catch (err) {
      setServerError(adminErrorMessage(err, "Something went wrong."))
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  const confirmAccounts = useMemo(
    () => [...selectedAccounts].map((id) => ({ id, name: unscheduledById.get(id)?.hospital_name ?? id })),
    [selectedAccounts, unscheduledById],
  )
  const shownAccounts = confirmAccounts.slice(0, 50)
  const hiddenAccountCount = confirmAccounts.length - shownAccounts.length
  const confirmArea = researchAreaLabel(
    researchAreas.find((a) => a.research_group_id === draft.research_group_id)?.name,
    draft.research_group_id,
  )

  const tzOptions = SCHEDULING_TIMEZONES.map((z) => ({ value: z, label: z, keywords: [z.replaceAll("_", " ")] }))

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
      <SheetHeader className="border-b p-5">
        <SheetTitle className="text-base">{isEdit ? "Edit schedule" : "New schedule"}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Change when this research runs. Saving recalculates the next run from now."
            : "New schedules are enabled as soon as they're saved."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
        <FormSection title="Target">
          {isEdit ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <LockedRow
                label="Account"
                value={accountsById.get(editing.account_id)?.hospital_name ?? editing.account_id}
                hint={editing.account_id}
              />
              <LockedRow
                label="Research area"
                value={researchAreaLabel(
                  researchAreasById.get(editing.research_group_id)?.name,
                  editing.research_group_id,
                )}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden="true" />
                {"Target can't be changed. Pause this schedule and create a new one instead."}
              </p>
            </div>
          ) : (
            <>
              <Field label="1. Research area" error={visibleErrors.research_group_id}>
                <div role="radiogroup" aria-label="Research area" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {researchAreas.map((area) => {
                    const active = draft.research_group_id === area.research_group_id
                    const scheduled = coverage.get(area.research_group_id)?.size ?? 0
                    const available = Math.max(accounts.length - scheduled, 0)
                    return (
                      <button
                        key={area.research_group_id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => selectArea(area.research_group_id)}
                        className={cn(
                          "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card hover:bg-muted",
                          visibleErrors.research_group_id && !active && "border-destructive/50",
                        )}
                      >
                        <span className="text-sm font-medium">
                          {researchAreaLabel(area.name, area.research_group_id)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {coverageLoading
                            ? "Loading coverage…"
                            : `${available.toLocaleString()} unscheduled · ${scheduled.toLocaleString()} scheduled`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field
                label="2. Accounts"
                htmlFor="account-search"
                error={visibleErrors.account_ids}
                hint={draft.research_group_id ? "Only accounts without an active schedule for this research area are listed." : undefined}
              >
                {draft.research_group_id ? (
                  unscheduledLoading && unscheduled.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                      Loading accounts…
                    </div>
                  ) : unscheduledError ? (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    >
                      {"Couldn't load accounts. "}
                      {adminErrorMessage(unscheduledError, "Could not load accounts.")}
                    </p>
                  ) : (
                    <AccountMultiPicker
                      id="account-search"
                      accounts={unscheduled}
                      selected={selectedAccounts}
                      onChange={(next) => {
                        setSelectedAccounts(next)
                        setServerError(null)
                      }}
                      alreadyScheduledCount={scheduledInArea?.size ?? 0}
                      invalid={Boolean(visibleErrors.account_ids)}
                    />
                  )
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
                    Choose a research area to see the accounts you can schedule.
                  </div>
                )}
              </Field>
            </>
          )}
        </FormSection>

        <FormSection title="Cadence">
          <div role="radiogroup" aria-label="Frequency" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {FORM_FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={draft.frequency_type === f.value}
                onClick={() => update("frequency_type", f.value)}
                className={cn(
                  "rounded-md py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  draft.frequency_type === f.value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {draft.frequency_type === "weekly" && (
            <Field label="Day" error={visibleErrors.days_of_week}>
              <div role="radiogroup" aria-label="Day of week" className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = draft.days_of_week.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => update("days_of_week", [day])}
                      className={cn(
                        "h-9 w-12 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {shortDay(day)}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {draft.frequency_type === "monthly" && (
            <Field
              label="Day of month"
              htmlFor="day-of-month"
              error={visibleErrors.day_of_month}
              hint="Limited to 1–28 so it lands in every month."
            >
              <Input
                id="day-of-month"
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={draft.day_of_month}
                onChange={(e) => update("day_of_month", e.target.value)}
                aria-invalid={Boolean(visibleErrors.day_of_month) || undefined}
                className="h-9 w-28 bg-card"
              />
            </Field>
          )}

          {draft.frequency_type === "custom_interval" && (
            <Field label="Repeat every" htmlFor="interval-days" error={visibleErrors.interval_days}>
              <div className="flex items-center gap-2">
                <Input
                  id="interval-days"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft.interval_days}
                  onChange={(e) => update("interval_days", e.target.value)}
                  aria-invalid={Boolean(visibleErrors.interval_days) || undefined}
                  className="h-9 w-28 bg-card"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="flex gap-1.5 rounded-lg bg-accent p-2.5 text-xs leading-relaxed text-accent-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Counts from each actual run, not from a fixed calendar. The first run is the next
                occurrence of the time below; editing the schedule later restarts the countdown from the
                time you save.
              </p>
            </Field>
          )}
        </FormSection>

        <FormSection title="Time">
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Time of day" htmlFor="time" error={visibleErrors.time}>
              <Input
                id="time"
                type="time"
                value={draft.time}
                onChange={(e) => update("time", e.target.value)}
                className="h-9 bg-card"
              />
            </Field>
            <Field label="Timezone" htmlFor="timezone" error={visibleErrors.timezone}>
              <SearchableSelect
                id="timezone"
                value={draft.timezone}
                onChange={(v) => update("timezone", v)}
                options={tzOptions}
                placeholder="Select a timezone"
                searchPlaceholder="Search e.g. New York, Berlin…"
                emptyText="No timezone found."
              />
            </Field>
          </div>
        </FormSection>

        <div className="flex flex-col gap-1.5 rounded-lg border border-primary/20 bg-accent/60 p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-accent-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Summary
          </p>
          {!isEdit && (
            <p className="text-sm text-pretty">
              {selectedAccounts.size > 0 && draft.research_group_id
                ? `${selectedAccounts.size.toLocaleString()} ${selectedAccounts.size === 1 ? "schedule" : "schedules"} for ${researchAreaLabel(researchAreasById.get(draft.research_group_id)?.name, draft.research_group_id)} — one per account.`
                : "No accounts selected yet."}
            </p>
          )}
          <p className="text-sm font-medium text-pretty">{summarize(draft)}</p>
          {nextRun ? (
            <p className="text-xs text-muted-foreground">
              Next run {formatInZone(nextRun, draft.timezone)} {zoneAbbreviation(nextRun, draft.timezone)} (
              {formatRelative(nextRun)}) · {formatUtc(nextRun)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Complete the fields above to preview the next run.</p>
          )}
        </div>

        {failedItems.length > 0 && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              {failedItems.length} of {requestedCount} accounts weren&apos;t scheduled
            </p>
            <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
              {failedItems.map((item) => (
                <li key={item.account_id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-mono text-amber-900">{item.account_id}</span>
                  <span className="text-right text-amber-700">
                    {item.reason ??
                      (item.status === "conflict"
                        ? "Already has an enabled schedule — disable it first"
                        : "Account not found")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {serverError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !hasChanges}>
          {submitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : selectedAccounts.size > 1
                ? `Create ${selectedAccounts.size.toLocaleString()} schedules`
                : "Create schedule"}
        </Button>
      </SheetFooter>

      <ConfirmDialog
        open={confirmOpen && !editing}
        title="Create schedules?"
        confirmLabel={
          selectedAccounts.size > 1
            ? `Create ${selectedAccounts.size.toLocaleString()} schedules`
            : "Create schedule"
        }
        busy={submitting}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => void doSubmit()}
      >
        <div className="flex flex-col gap-2">
          <p>
            {selectedAccounts.size.toLocaleString()} {selectedAccounts.size === 1 ? "schedule" : "schedules"} for{" "}
            {confirmArea} — one per account.
          </p>
          <p className="font-medium text-foreground">{summarize(draft)}</p>
          {nextRun ? (
            <p className="text-xs text-muted-foreground">
              First run {formatInZone(nextRun, draft.timezone)} {zoneAbbreviation(nextRun, draft.timezone)} (
              {formatRelative(nextRun)})
            </p>
          ) : null}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Accounts ({confirmAccounts.length})</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border bg-muted/50 p-2">
              {shownAccounts.map((account) => (
                <li key={account.id} className="truncate text-sm">
                  {account.name}
                </li>
              ))}
            </ul>
            {hiddenAccountCount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">and {hiddenAccountCount.toLocaleString()} more…</p>
            )}
          </div>
        </div>
      </ConfirmDialog>
    </form>
  )
}

function summarize(draft: Draft) {
  const at = `at ${draft.time || "--:--"} ${draft.timezone.split("/").pop()?.replaceAll("_", " ") ?? ""} time`
  switch (draft.frequency_type) {
    case "daily":
      return `Runs every day ${at}.`
    case "weekly": {
      const days = sortDays(draft.days_of_week).map(shortDay)
      if (!days.length) return "Pick at least one day."
      const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} & ${days.at(-1)}` : days[0]
      return `Runs every ${list} ${at}.`
    }
    case "monthly": {
      const dom = Number(draft.day_of_month)
      return dom >= 1 && dom <= 28 ? `Runs on the ${ordinal(dom)} of every month ${at}.` : "Choose a day between 1 and 28."
    }
    case "custom_interval": {
      const n = Number(draft.interval_days)
      return n >= 1 ? `Runs every ${n} ${n === 1 ? "day" : "days"} ${at}, counted from each run.` : "Enter an interval of 1 day or more."
    }
  }
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function LockedRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">
        {value} {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  )
}
