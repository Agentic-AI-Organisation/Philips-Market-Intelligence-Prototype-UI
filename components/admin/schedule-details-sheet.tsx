"use client"

import { Pause, Pencil, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Account, ResearchAreaModelConfig, ScheduleConfig } from "@/lib/types"
import { formatInZone, formatUtc } from "@/lib/schedule-time"
import { researchAreaLabel } from "@/lib/use-admin-data"
import { Cadence, DispatchBadge, ZonedTime } from "./schedule-bits"

interface ScheduleDetailsSheetProps {
  row: ScheduleConfig | null
  onClose: () => void
  accountsById: Map<string, Account>
  researchAreasById: Map<string, ResearchAreaModelConfig>
  pending: boolean
  onEdit: (row: ScheduleConfig) => void
  onToggle: (row: ScheduleConfig, enabled: boolean) => void
}

export function ScheduleDetailsSheet({
  row,
  onClose,
  accountsById,
  researchAreasById,
  pending,
  onEdit,
  onToggle,
}: ScheduleDetailsSheetProps) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {row && (
          <>
            <SheetHeader className="border-b p-5">
              <div className="flex items-center gap-2">
                <span
                  className={
                    row.is_enabled
                      ? "rounded-md bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success"
                      : "rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {row.is_enabled ? "Enabled" : "Paused"}
                </span>
                <span className="text-xs text-muted-foreground">Schedule #{row.id}</span>
              </div>
              <SheetTitle className="text-base">
                {accountsById.get(row.account_id)?.hospital_name ?? row.account_id}
              </SheetTitle>
              <SheetDescription>
                {researchAreaLabel(researchAreasById.get(row.research_group_id)?.name, row.research_group_id)} ·{" "}
                {row.account_id}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
              <DetailGroup title="Schedule">
                <DetailRow label="Cadence">
                  <Cadence row={row} />
                </DetailRow>
                <DetailRow label="Next run">
                  {row.is_enabled ? (
                    <ZonedTime iso={row.next_run_at} timeZone={row.timezone} />
                  ) : (
                    <span className="text-muted-foreground">— (paused)</span>
                  )}
                </DetailRow>
              </DetailGroup>

              <DetailGroup title="Last run">
                <DetailRow label="Triggered">
                  <ZonedTime iso={row.last_triggered_at} timeZone={row.timezone} empty="Never run" />
                </DetailRow>
                <DetailRow label="Dispatch">
                  {row.last_run_status ? (
                    <DispatchBadge status={row.last_run_status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </DetailRow>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Dispatch status only confirms the run was handed off to research, not whether the research
                  finished.
                </p>
              </DetailGroup>

              <DetailGroup title="Audit">
                <DetailRow label="Created">
                  <AuditValue iso={row.created_at} by={row.created_by} timeZone={row.timezone} />
                </DetailRow>
                <DetailRow label="Updated">
                  <AuditValue iso={row.updated_at} by={row.updated_by} timeZone={row.timezone} />
                </DetailRow>
              </DetailGroup>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button variant="outline" disabled={pending} onClick={() => onToggle(row, !row.is_enabled)}>
                {row.is_enabled ? (
                  <Pause data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Play data-icon="inline-start" aria-hidden="true" />
                )}
                {row.is_enabled ? "Pause" : "Resume"}
              </Button>
              <Button onClick={() => onEdit(row)}>
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Edit
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-start gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function AuditValue({ iso, by, timeZone }: { iso: string; by: string; timeZone: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span>{formatInZone(iso, timeZone, { year: "numeric" })}</span>
      <span className="text-xs text-muted-foreground">
        {by} · {formatUtc(iso)}
      </span>
    </div>
  )
}
