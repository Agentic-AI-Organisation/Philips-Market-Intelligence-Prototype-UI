"use client"

import { useEffect, useState } from "react"
import { Sparkles, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActiveSignal, GroupSummaryEntry } from "@/lib/types"
import { researchAreaLabel } from "@/lib/use-admin-data"

function relativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}d ago`
}

function ExecutiveBrief({ entry, className }: { entry: GroupSummaryEntry | null | undefined; className?: string }) {
  return (
    <div className={cn("flex h-full flex-col rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        AI executive brief
      </div>
      <p className="mt-3 text-sm leading-relaxed">
        {entry?.summary || "No executive summary available yet for this account and requirement group."}
      </p>
    </div>
  )
}

function ActiveSignals({ signals, className }: { signals: ActiveSignal[]; className?: string }) {
  const [topicAvailability, setTopicAvailability] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkTopics = () => {
      const availability: Record<string, boolean> = {}
      signals.forEach((signal) => {
        if (signal.topic) availability[signal.topic] = !!document.getElementById(`topic-${signal.topic}`)
      })
      setTopicAvailability(availability)
    }
    checkTopics()
    const timer = setTimeout(checkTopics, 500)
    return () => clearTimeout(timer)
  }, [signals])

  const handleSignalClick = (topic: string | null | undefined) => {
    if (!topic) return
    const element = document.getElementById(`topic-${topic}`)
    if (!element) return
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    element.classList.add("ring-2", "ring-primary", "ring-offset-2", "scale-[1.01]", "transition-all", "duration-300")
    setTimeout(() => element.classList.remove("ring-2", "ring-primary", "ring-offset-2", "scale-[1.01]"), 1500)
  }

  return (
    <div className={cn("flex h-full flex-col rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="size-4 text-amber-500" aria-hidden="true" />
        Active signals
      </div>
      {signals.length === 0 ? (
        <p className="mt-3 text-sm italic text-muted-foreground">No active signals identified yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {signals.map((signal, i) => {
            const rel = relativeTime(signal.date)
            const hasTopic = signal.topic ? (topicAvailability[signal.topic] ?? false) : false

            return (
              <li
                key={i}
                onClick={() => hasTopic && handleSignalClick(signal.topic)}
                className={cn(
                  "-mx-1.5 flex items-start gap-2 rounded-lg p-1.5 text-sm transition-all duration-200",
                  hasTopic && "cursor-pointer hover:bg-accent active:scale-[0.98]",
                )}
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="flex-1">
                  <span className={cn(hasTopic && "font-medium")}>{signal.text}</span>
                  {rel && <span className="text-xs text-muted-foreground"> ({rel})</span>}
                  {signal.topic && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {researchAreaLabel(signal.topic, signal.topic)}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function SummaryPanel({ entry }: { entry: GroupSummaryEntry | null | undefined }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
      <ExecutiveBrief entry={entry} className="lg:col-span-2" />
      <ActiveSignals signals={entry?.active_signals ?? []} className="lg:col-span-1" />
    </div>
  )
}
