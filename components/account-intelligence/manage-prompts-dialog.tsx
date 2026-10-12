"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { BookmarkPlus, Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as api from "@/lib/mock-api"
import { ApiError, type SavedPrompt } from "@/lib/types"
import { useRevalidatePrompts, useSavedPrompts, useSystemPrompts } from "@/lib/use-prompts-data"

interface ManagePromptsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Draft {
  name: string
  prompt_text: string
}

const EMPTY_DRAFT: Draft = { name: "", prompt_text: "" }

// The editable counterpart to PromptLibraryDialog's browse-only view —
// everything a user can do to their own Saved Prompts (add, edit, delete,
// or pull a copy in from the system library) lives here in one place.
export function ManagePromptsDialog({ open, onOpenChange }: ManagePromptsDialogProps) {
  const { systemPrompts } = useSystemPrompts()
  const { savedPrompts } = useSavedPrompts(api.CURRENT_USER)
  const revalidate = useRevalidatePrompts()

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [addingText, setAddingText] = useState<string | null>(null)

  function resetForm() {
    setCreating(false)
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
  }

  // Fresh form every time the dialog is reopened, rather than resuming
  // whatever was mid-edit last time.
  useEffect(() => {
    if (open) resetForm()
  }, [open])

  function startCreate() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setCreating(true)
  }

  function startEdit(prompt: SavedPrompt) {
    setCreating(false)
    setEditingId(prompt.id)
    setDraft({ name: prompt.name, prompt_text: prompt.prompt_text })
  }

  const atCap = savedPrompts.length >= api.MAX_SAVED_PROMPTS
  const formOpen = creating || editingId !== null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.prompt_text.trim()) return
    setSubmitting(true)
    try {
      if (editingId !== null) {
        await api.updateSavedPrompt(editingId, api.CURRENT_USER, draft)
        toast.success("Prompt updated")
      } else {
        await api.saveSavedPrompt(api.CURRENT_USER, draft.name, draft.prompt_text)
        toast.success("Prompt saved")
      }
      await revalidate()
      resetForm()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Saved prompts are full", { description: err.message })
      } else {
        toast.error("Couldn't save prompt", { description: err instanceof Error ? err.message : undefined })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.deleteSavedPrompt(id, api.CURRENT_USER)
      toast.success("Prompt removed")
      await revalidate()
    } catch (err) {
      toast.error("Couldn't remove prompt", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAddSystemPrompt(name: string, promptText: string) {
    setAddingText(promptText)
    try {
      await api.saveSavedPrompt(api.CURRENT_USER, name, promptText)
      toast.success("Added to Saved Prompts")
      await revalidate()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Saved prompts are full", { description: err.message })
      } else {
        toast.error("Couldn't add prompt", { description: err instanceof Error ? err.message : undefined })
      }
    } finally {
      setAddingText(null)
    }
  }

  const savedTexts = new Set(savedPrompts.map((p) => p.prompt_text))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-[90vw] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 pb-3 space-y-0">
          <DialogTitle>Manage prompts</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="saved" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex items-center gap-2 border-b p-3">
            <TabsList>
              <TabsTrigger value="saved">Saved prompts</TabsTrigger>
              <TabsTrigger value="system">Add from system prompts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="saved" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {savedPrompts.length} / {api.MAX_SAVED_PROMPTS} saved
              </span>
              {!formOpen && (
                <Button size="sm" onClick={startCreate} disabled={atCap}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  New prompt
                </Button>
              )}
            </div>
            {atCap && !formOpen && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve reached the {api.MAX_SAVED_PROMPTS}-prompt limit — remove one to add another.
              </p>
            )}

            {formOpen && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{editingId !== null ? "Edit prompt" : "New prompt"}</span>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={resetForm}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manage-prompt-name">Name</Label>
                  <Input
                    id="manage-prompt-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Quarterly financial summary"
                    className="bg-card"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manage-prompt-text">Prompt</Label>
                  <Textarea
                    id="manage-prompt-text"
                    value={draft.prompt_text}
                    onChange={(e) => setDraft((d) => ({ ...d, prompt_text: e.target.value }))}
                    rows={4}
                    className="bg-card"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !draft.name.trim() || !draft.prompt_text.trim()}>
                    {submitting ? "Saving…" : editingId !== null ? "Save changes" : "Save prompt"}
                  </Button>
                </div>
              </form>
            )}

            {savedPrompts.length === 0 && !formOpen ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                Nothing saved yet — add one above, or pull one in from the system prompts tab.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {savedPrompts.map((prompt) => (
                  <div key={prompt.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{prompt.name}</span>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{prompt.prompt_text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(prompt)} aria-label={`Edit ${prompt.name}`}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deletingId === prompt.id}
                        onClick={() => handleDelete(prompt.id)}
                        aria-label={`Delete ${prompt.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="system" className="min-h-0 flex-1 overflow-y-auto p-3">
            {systemPrompts.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">No system prompts yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {systemPrompts.map((prompt) => {
                  const alreadySaved = savedTexts.has(prompt.prompt_text)
                  return (
                    <div key={prompt.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{prompt.name}</span>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{prompt.prompt_text}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={alreadySaved || addingText === prompt.prompt_text || atCap}
                        onClick={() => handleAddSystemPrompt(prompt.name, prompt.prompt_text)}
                      >
                        {alreadySaved ? (
                          <>
                            <Check data-icon="inline-start" aria-hidden="true" />
                            Added
                          </>
                        ) : (
                          <>
                            <BookmarkPlus data-icon="inline-start" aria-hidden="true" />
                            Add to saved
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
