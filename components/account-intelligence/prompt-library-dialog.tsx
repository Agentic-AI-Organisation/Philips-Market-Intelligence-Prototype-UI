"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Library, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import * as api from "@/lib/mock-api"
import { ApiError, type SavedPrompt } from "@/lib/types"
import { useRevalidatePrompts, useSavedPrompts, useSystemPrompts } from "@/lib/use-prompts-data"

interface PromptLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Picking a prompt only fills the chat input — it never sends on the
  // caller's behalf, so the user can review/edit before sending themselves.
  onSelectPrompt: (text: string) => void
}

const SAVED_PROMPT_CAP = 15
const RENDER_CAP = 15

function matches(q: string, p: { name: string; prompt_text: string }) {
  return !q || p.name.toLowerCase().includes(q) || p.prompt_text.toLowerCase().includes(q)
}

function PromptSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-sm text-destructive">
      {children}
    </p>
  )
}

function CapNote({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null
  return (
    <p className="text-center text-xs text-muted-foreground">
      Showing first {shown} of {total.toLocaleString()} — refine search
    </p>
  )
}

/**
 * Central prompt library modal, launched from the chat widget. System tab is
 * read-only (admin-owned); Saved tab is the user's own collection with full
 * create / edit / delete in place. Both lists stay mounted during edits so
 * search text and scroll depth survive.
 */
export function PromptLibraryDialog({ open, onOpenChange, onSelectPrompt }: PromptLibraryDialogProps) {
  const { systemPrompts, error: systemError, isLoading: systemLoading } = useSystemPrompts()
  const { savedPrompts, error: savedError, isLoading: savedLoading } = useSavedPrompts(api.CURRENT_USER)
  const revalidate = useRevalidatePrompts()

  const [tab, setTab] = useState<"system" | "saved">("saved")
  const [query, setQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SavedPrompt | null>(null)
  const [deleting, setDeleting] = useState<SavedPrompt | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Fresh search every time it's reopened, rather than resuming a stale
  // query from last time.
  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  const q = query.trim().toLowerCase()
  const filteredSystem = useMemo(() => systemPrompts.filter((p) => matches(q, p)), [systemPrompts, q])
  const filteredSaved = useMemo(() => savedPrompts.filter((p) => matches(q, p)), [savedPrompts, q])
  const atCap = savedPrompts.length >= SAVED_PROMPT_CAP

  function selectPrompt(text: string) {
    onSelectPrompt(text)
    onOpenChange(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteSavedPrompt(deleting.id, api.CURRENT_USER)
      toast.success("Prompt deleted")
    } catch (err) {
      // 404 (missing or someone else's) converges on the refresh below.
      if (!(err instanceof ApiError && err.status === 404)) {
        toast.error("Couldn't delete prompt", { description: err instanceof Error ? err.message : undefined })
      }
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
      await revalidate()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] min-h-[420px] max-w-[90vw] flex-col gap-0 p-0 sm:max-w-md">
          <DialogHeader className="flex-row items-center gap-2.5 space-y-0 border-b px-5 py-4 pr-12">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Library className="size-[18px]" aria-hidden="true" />
            </span>
            <DialogTitle className="text-base font-semibold">Prompt library</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "system" | "saved")} className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="shrink-0 border-b px-5 py-3">
              <TabsList className="w-full">
                <TabsTrigger value="system">System prompts</TabsTrigger>
                <TabsTrigger value="saved">Saved prompts</TabsTrigger>
              </TabsList>
              <div className="relative mt-2.5">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or text…"
                  aria-label="Search prompts"
                  className="h-9 bg-card pl-9"
                />
              </div>
            </div>

            <TabsContent value="system" className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
              {systemLoading && systemPrompts.length === 0 ? (
                <div className="mb-5">
                  <PromptSkeletons />
                </div>
              ) : systemError ? (
                <div className="mb-5">
                  <ErrorNote>{systemError instanceof Error ? systemError.message : "Failed to load system prompts"}</ErrorNote>
                </div>
              ) : filteredSystem.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {q ? "No system prompts match your search." : "No system prompts yet."}
                </p>
              ) : (
                <div className="flex flex-col gap-3 pb-5">
                  <ul className="flex flex-col gap-3">
                    {filteredSystem.slice(0, RENDER_CAP).map((row) => (
                      <li
                        key={row.id}
                        className="rounded-xl border bg-muted/40 p-4 transition-colors hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Load prompt ${row.name} into chat`}
                          title="Click to load into chat"
                          onClick={() => selectPrompt(row.prompt_text)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              selectPrompt(row.prompt_text)
                            }
                          }}
                          className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          <p className="mt-1 line-clamp-3 text-xs leading-snug text-muted-foreground">{row.prompt_text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <CapNote shown={RENDER_CAP} total={filteredSystem.length} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
              {savedLoading && savedPrompts.length === 0 && !savedError ? (
                <PromptSkeletons />
              ) : (
                <div className="flex flex-col gap-3 pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {savedPrompts.length > 0 && (
                        <span
                          className={cn(
                            atCap
                              ? "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset"
                              : "font-medium text-foreground",
                          )}
                        >
                          {savedPrompts.length} / {SAVED_PROMPT_CAP} saved
                        </span>
                      )}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={atCap}
                      title={atCap ? "Limit reached — delete one first" : undefined}
                      onClick={() => {
                        setEditing(null)
                        setFormOpen(true)
                      }}
                    >
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Create prompt
                    </Button>
                  </div>
                  {atCap && <p className="text-xs text-muted-foreground">Limit reached — delete one before adding another.</p>}
                  {savedError && (
                    <ErrorNote>{savedError instanceof Error ? savedError.message : "Failed to load saved prompts"}</ErrorNote>
                  )}

                  {filteredSaved.length === 0 && !savedError ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {q ? "No saved prompts match your search." : "No saved prompts yet."}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {filteredSaved.slice(0, RENDER_CAP).map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Load prompt ${row.name} into chat`}
                            title="Click to load into chat"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest("button")) return
                              selectPrompt(row.prompt_text)
                            }}
                            onKeyDown={(e) => {
                              if ((e.target as HTMLElement).closest("button") || (e.key !== "Enter" && e.key !== " ")) return
                              e.preventDefault()
                              selectPrompt(row.prompt_text)
                            }}
                            className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(row)
                                    setFormOpen(true)
                                  }}
                                  aria-label={`Edit ${row.name}`}
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  <Pencil className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleting(row)}
                                  aria-label={`Delete ${row.name}`}
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 line-clamp-3 text-xs leading-snug text-muted-foreground">{row.prompt_text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <CapNote shown={RENDER_CAP} total={filteredSaved.length} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <SavedPromptFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void revalidate()}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        confirmLabel="Delete prompt"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>This removes the prompt outright, there&apos;s no undo.</p>
      </ConfirmDialog>
    </>
  )
}

function SavedPromptFormSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: SavedPrompt | null
  onSaved: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{editing ? "Edit saved prompt" : "Create prompt"}</SheetTitle>
          <SheetDescription>Saved prompts are private to you and available in every account chat.</SheetDescription>
        </SheetHeader>
        {open && (
          <SavedPromptForm
            key={editing?.id ?? "new"}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onSaved()
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SavedPromptForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing: SavedPrompt | null
  onCancel: () => void
  onSaved: () => void
}) {
  const isEdit = editing !== null
  const [name, setName] = useState(editing?.name ?? "")
  const [promptText, setPromptText] = useState(editing?.prompt_text ?? "")
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (!name.trim() || !promptText.trim()) return
    setSubmitting(true)
    setServerError(null)
    try {
      if (editing) {
        const payload: { name?: string; prompt_text?: string } = {}
        if (name.trim() !== editing.name) payload.name = name.trim()
        if (promptText.trim() !== editing.prompt_text) payload.prompt_text = promptText.trim()
        if (Object.keys(payload).length > 0) await api.updateSavedPrompt(editing.id, api.CURRENT_USER, payload)
        toast.success("Prompt updated")
      } else {
        await api.saveSavedPrompt(api.CURRENT_USER, name.trim(), promptText.trim())
        toast.success("Prompt saved")
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        onSaved()
      } else if (err instanceof ApiError && err.status === 409) {
        setServerError(`Saved prompt limit reached (${SAVED_PROMPT_CAP}). Delete one first.`)
      } else {
        setServerError(err instanceof Error ? err.message : "Something went wrong.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const nameInvalid = showErrors && !name.trim()
  const textInvalid = showErrors && !promptText.trim()

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saved-prompt-name">Name</Label>
        <Input
          id="saved-prompt-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setServerError(null)
          }}
          placeholder="e.g. QBR prep"
          maxLength={200}
          aria-invalid={nameInvalid || undefined}
          className="bg-card"
        />
        {nameInvalid && <p className="text-xs text-destructive">Give the prompt a name.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saved-prompt-text">Prompt text</Label>
        <Textarea
          id="saved-prompt-text"
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value)
            setServerError(null)
          }}
          placeholder="What should the assistant do with this prompt…"
          rows={6}
          aria-invalid={textInvalid || undefined}
          className="bg-card leading-relaxed"
        />
        {textInvalid && <p className="text-xs text-destructive">Prompt text can&apos;t be empty.</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="mt-auto flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create prompt"}
        </Button>
      </div>
    </form>
  )
}
