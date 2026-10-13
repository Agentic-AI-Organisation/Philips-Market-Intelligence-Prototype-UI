"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { SignalEntry } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// entries is newest-first (see signalsFor) - the first one is "the latest"
// shown inline, the rest are available via the "+N more" popover rather
// than cluttering the table with every historical entry.
export function SignalCell({ entries }: { entries: SignalEntry[] }) {
  if (entries.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  const [latest, ...rest] = entries

  return (
    <Popover>
      <PopoverTrigger className="block w-full rounded-md text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="line-clamp-2 text-sm font-medium text-foreground">{latest.headline}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {formatDate(latest.event_date)}
          {rest.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground">+{rest.length} more</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="max-h-80 w-80 overflow-y-auto" align="start">
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="border-b pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold">{entry.headline}</p>
              <p className="text-xs text-muted-foreground">{formatDate(entry.event_date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.narrative}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">Source: {entry.sources.join(" · ")}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
