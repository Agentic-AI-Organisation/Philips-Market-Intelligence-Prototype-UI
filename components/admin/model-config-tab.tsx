"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as api from "@/lib/mock-api"
import { EFFORTS, MODELS, type Effort, type ModelName, type ResearchAreaModelConfig } from "@/lib/types"
import { formatRelative, formatUtc } from "@/lib/schedule-time"
import { researchAreaLabel, useModelConfig } from "@/lib/use-admin-data"

const modelItems = MODELS.map((m) => ({ value: m, label: m }))
const effortItems = EFFORTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))

export function ModelConfigTab() {
  const { researchAreas, isLoading, mutate } = useModelConfig()

  return (
    <section aria-labelledby="model-config-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 rounded-xl border bg-card p-5">
        <h2 id="model-config-heading" className="font-semibold">
          Model config
        </h2>
        <p className="text-xs text-muted-foreground">
          The model and reasoning effort each research area uses. Changes apply to the next run, scheduled or
          manual.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">Research area</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead className="pr-4">
                <span className="sr-only">Save</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j} className="py-4 first:pl-4">
                        <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : researchAreas.map((row) => (
                  <ModelConfigRow
                    key={`${row.research_group_id}-${row.updated_at}`}
                    row={row}
                    onSaved={() => mutate()}
                  />
                ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function ModelConfigRow({
  row,
  onSaved,
}: {
  row: ResearchAreaModelConfig
  onSaved: () => void
}) {
  const [model, setModel] = useState<ModelName>(row.model)
  const [effort, setEffort] = useState<Effort>(row.effort)
  const [saving, setSaving] = useState(false)
  const label = researchAreaLabel(row.name, row.research_group_id)
  const dirty = model !== row.model || effort !== row.effort

  async function save() {
    const payload: Partial<Pick<ResearchAreaModelConfig, "model" | "effort">> = {}
    if (model !== row.model) payload.model = model
    if (effort !== row.effort) payload.effort = effort
    setSaving(true)
    try {
      await api.updateModelConfig(row.research_group_id, payload)
      toast.success(`${label} updated`, { description: `${model} · ${effort} effort` })
      onSaved()
    } catch (err) {
      toast.error("Couldn't save model config", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="py-3 pl-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{row.research_group_id}</span>
        </div>
      </TableCell>
      <TableCell>
        <Select items={modelItems} value={model} onValueChange={(v) => v && setModel(v as ModelName)}>
          <SelectTrigger aria-label={`Model for ${label}`} className="h-9 w-40 bg-card font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modelItems.map((item) => (
              <SelectItem key={item.value} value={item.value} className="font-mono text-xs">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select items={effortItems} value={effort} onValueChange={(v) => v && setEffort(v as Effort)}>
          <SelectTrigger aria-label={`Effort for ${label}`} className="h-9 w-32 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {effortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <span className="flex flex-col gap-0.5">
          <span>{formatRelative(row.updated_at)}</span>
          <span className="text-xs text-muted-foreground">{formatUtc(row.updated_at)}</span>
        </span>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {dirty && !saving && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setModel(row.model)
                setEffort(row.effort)
              }}
            >
              Reset
            </Button>
          )}
          <Button size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
