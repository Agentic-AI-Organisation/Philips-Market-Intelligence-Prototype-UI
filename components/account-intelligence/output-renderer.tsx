"use client"

import { useState } from "react"
import { ChevronDown, ExternalLink, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

interface SourceLike {
  source?: string
  date?: string
  url?: string
}

function isSourceArray(value: unknown): value is SourceLike[] {
  return (
    Array.isArray(value) && value.every((v) => v && typeof v === "object" && ("source" in v || "url" in v || "date" in v))
  )
}

function Sources({ sources }: { sources: SourceLike[] }) {
  const usable = sources.filter((s) => s.source || s.url)
  if (usable.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {usable.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {s.source || s.url} <ExternalLink className="size-2.5" aria-hidden="true" />
          </a>
        ) : (
          <span key={i} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {s.source} {s.date ? `· ${s.date}` : ""}
          </span>
        ),
      )}
    </div>
  )
}

interface FindingItem {
  title?: string
  details?: string
  recency?: string
  citations?: SourceLike[]
}

function isFindingItem(value: unknown): value is FindingItem {
  return !!value && typeof value === "object" && !Array.isArray(value) && ("title" in value || "details" in value)
}

// A finding doesn't carry its own single date, only per-citation dates —
// this picks the latest one as "the" date for the finding as a whole.
function latestCitationDate(citations: SourceLike[]): string | null {
  const validDates = citations.map((c) => c.date).filter((d): d is string => !!d && !Number.isNaN(new Date(d).getTime()))
  if (validDates.length === 0) return null
  return validDates.reduce((latest, d) => (new Date(d) > new Date(latest) ? d : latest))
}

function DateBadge({ date }: { date: string | null }) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
    </span>
  )
}

// A single research finding: collapsed to just its title by default, since a
// topic can hold many of these — expanding one at a time keeps the page
// scannable instead of dumping every finding's full narrative at once.
function CollapsibleFinding({ item }: { item: FindingItem }) {
  const [open, setOpen] = useState(false)
  const citations = Array.isArray(item.citations) ? item.citations : []
  const rawTitle = item.title || "Untitled finding"
  const badgeDate = latestCitationDate(citations)

  return (
    <div className="rounded-lg border bg-muted/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
        <span className="text-sm font-medium">{rawTitle}</span>
        <div className="flex shrink-0 items-center gap-2">
          <DateBadge date={badgeDate} />
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 py-3">
          {item.details && <p className="text-sm leading-relaxed text-muted-foreground">{item.details}</p>}
          <Sources sources={citations} />
        </div>
      )}
    </div>
  )
}

// Dispatches a single array item to the collapsed-finding view when it looks
// like a research finding (title/details/recency/citations), falling back to
// the generic recursive renderer for anything else.
function FindingOrValue({ item, depth }: { item: unknown; depth: number }) {
  if (isFindingItem(item)) return <CollapsibleFinding item={item} />
  return <OutputValue value={item} depth={depth} />
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

export function OutputValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (isEmpty(value)) return <span className="text-sm italic text-muted-foreground">Not found</span>

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="text-sm">{String(value)}</span>
  }

  if (isSourceArray(value)) return <Sources sources={value} />

  if (Array.isArray(value)) {
    return (
      <div className={cn("space-y-2", depth > 0 && "mt-1")}>
        {value.map((item, i) =>
          isFindingItem(item) ? (
            <CollapsibleFinding key={i} item={item} />
          ) : (
            <div key={i} className="rounded-lg border bg-muted/40 p-3">
              <OutputValue value={item} depth={depth + 1} />
            </div>
          ),
        )}
      </div>
    )
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
    const sourceEntry = entries.find(([k]) => k === "sources")
    const otherEntries = entries.filter(([k]) => k !== "sources")

    return (
      <div className="space-y-1.5">
        {otherEntries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(120px,180px)_1fr] gap-3 text-sm">
            <span className="font-medium text-muted-foreground">{humanize(k)}</span>
            <OutputValue value={v} depth={depth + 1} />
          </div>
        ))}
        {sourceEntry && <OutputValue value={sourceEntry[1]} depth={depth + 1} />}
      </div>
    )
  }

  return null
}

// Normalizes a category's raw value (single object, array of objects, or
// absent) into a flat list of items so cards can render consistently either way.
function toItems(value: unknown): unknown[] {
  if (isEmpty(value)) return []
  return Array.isArray(value) ? value.filter((v) => !isEmpty(v)) : [value]
}

// Whether a topic's value has any real content worth a card — so an account
// with no findings for a topic doesn't show an empty "No data captured yet" card.
export function hasCategoryData(value: unknown): boolean {
  return toItems(value).length > 0
}

export function CategoryCard({ title, value, id }: { title: string; value: unknown; id?: string }) {
  const items = toItems(value)

  return (
    <div id={id} className="flex flex-col rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {items.length === 0 ? "No data" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No data captured yet for this category.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <FindingOrValue key={i} item={item} depth={0} />
          ))}
        </div>
      )}
    </div>
  )
}
