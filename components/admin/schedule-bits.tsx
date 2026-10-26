"use client"

import { cn } from "@/lib/utils"
import type { LastRunStatus, ScheduleConfig } from "@/lib/types"
import {
  describeFrequency,
  formatInZone,
  formatRelative,
  formatTimeOfDay,
  formatUtc,
  zoneAbbreviation,
} from "@/lib/schedule-time"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Dispatch status only confirms the run was handed off for research — not
 * whether the research finished. Never label this "completed".
 */
export function DispatchBadge({ status }: { status: LastRunStatus }) {
  if (!status) return null
  const failed = status === "dispatch_failed"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        failed
          ? "bg-destructive/10 text-destructive ring-destructive/20"
          : "bg-success/10 text-success ring-success/20",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", failed ? "bg-destructive" : "bg-success")}
        aria-hidden="true"
      />
      {failed ? "Send failed" : "Sent for research"}
    </span>
  )
}

export function Cadence({ row }: { row: ScheduleConfig }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{describeFrequency(row)}</span>
      <span className="text-xs text-muted-foreground">
        {formatTimeOfDay(row.time_of_day)} · {row.timezone}
      </span>
    </div>
  )
}

export function ZonedTime({
  iso,
  timeZone,
  empty = "—",
}: {
  iso: string | null
  timeZone: string
  empty?: string
}) {
  if (!iso) return <span className="text-muted-foreground">{empty}</span>
  const date = new Date(iso)
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="flex cursor-default flex-col gap-0.5 text-left" />}
      >
        <span>
          {formatInZone(date, timeZone)}{" "}
          <span className="text-xs text-muted-foreground">{zoneAbbreviation(date, timeZone)}</span>
        </span>
        <span className="text-xs text-muted-foreground">{formatRelative(date)}</span>
      </TooltipTrigger>
      <TooltipContent>{formatUtc(date)}</TooltipContent>
    </Tooltip>
  )
}
