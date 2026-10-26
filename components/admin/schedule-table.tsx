"use client"

import { CalendarX2, Info, MoreHorizontal, Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Account, ResearchAreaModelConfig, ScheduleConfig, StatusFilter } from "@/lib/types"
import { adminErrorMessage } from "@/lib/admin-roles"
import { researchAreaLabel } from "@/lib/use-admin-data"
import { Cadence, DispatchBadge, ZonedTime } from "./schedule-bits"

interface ScheduleTableProps {
  rows: ScheduleConfig[]
  isLoading: boolean
  error: unknown
  accountsById: Map<string, Account>
  researchAreasById: Map<string, ResearchAreaModelConfig>
  pendingIds: Set<number>
  onToggle: (row: ScheduleConfig, enabled: boolean) => void
  onEdit: (row: ScheduleConfig) => void
  onDetails: (row: ScheduleConfig) => void
  emptyAction: ReactNode
  statusFilter: StatusFilter
}

export function ScheduleTable({
  rows,
  isLoading,
  error,
  accountsById,
  researchAreasById,
  pendingIds,
  onToggle,
  onEdit,
  onDetails,
  emptyAction,
  statusFilter,
}: ScheduleTableProps) {
  if (error && !rows.length) {
    return (
      <p role="alert" className="px-6 py-12 text-center text-sm text-destructive">
        {"Couldn't load schedules. "}
        {error ? adminErrorMessage(error, "Failed to load schedules") : ""}
      </p>
    )
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarX2 className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {statusFilter === "paused" ? "No paused schedules" : "No schedules match these filters"}
          </p>
        </div>
        {emptyAction}
      </div>
    )
  }

  return (
    <Table className="min-w-[880px]">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-44 pl-4">Account</TableHead>
          <TableHead>Research area</TableHead>
          <TableHead>Cadence</TableHead>
          <TableHead>Next run</TableHead>
          <TableHead>Last run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <TableCell key={j} className="py-4 first:pl-4">
                    <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : rows.map((row) => {
              const account = accountsById.get(row.account_id)
              const area = researchAreasById.get(row.research_group_id)
              const pending = pendingIds.has(row.id)
              const accountName = account?.hospital_name ?? row.account_id
              return (
                <TableRow key={row.id} data-state={row.is_enabled ? undefined : "paused"}>
                  <TableCell className="w-44 max-w-44 py-3 pl-4">
                    <button
                      onClick={() => onDetails(row)}
                      className="flex w-full flex-col gap-0.5 text-left break-words hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="w-full truncate font-medium">{accountName}</span>
                      <span className="text-xs break-all text-muted-foreground">{row.account_id}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {researchAreaLabel(area?.name, row.research_group_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Cadence row={row} />
                  </TableCell>
                  <TableCell>
                    {row.is_enabled ? (
                      <ZonedTime iso={row.next_run_at} timeZone={row.timezone} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.last_triggered_at ? (
                      <div className="flex flex-col items-start gap-1">
                        <ZonedTime iso={row.last_triggered_at} timeZone={row.timezone} />
                        <DispatchBadge status={row.last_run_status} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Never run</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={row.is_enabled}
                        disabled={pending}
                        onCheckedChange={(checked) => onToggle(row, checked)}
                        aria-label={`${row.is_enabled ? "Pause" : "Resume"} schedule for ${accountName}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {pending ? "Saving…" : row.is_enabled ? "Enabled" : "Paused"}
                      </span>
                    </label>
                  </TableCell>
                  <TableCell className="pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${accountName}`}
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          <Pencil aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDetails(row)}>
                          <Info aria-hidden="true" />
                          Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
      </TableBody>
    </Table>
  )
}
