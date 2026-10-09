"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import * as api from "@/lib/mock-api"
import type { SystemPrompt } from "@/lib/types"
import { useRevalidatePrompts, useSystemPrompts } from "@/lib/use-prompts-data"

interface Draft {
  name: string
  prompt_text: string
}

const EMPTY_DRAFT: Draft = { name: "", prompt_text: "" }

export function SystemPromptsPanel() {
  const { systemPrompts, isLoading } = useSystemPrompts()
  const revalidate = useRevalidatePrompts()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function startCreate() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setCreating(true)
  }

  function startEdit(prompt: SystemPrompt) {
    setCreating(false)
    setEditingId(prompt.id)
    setDraft({ name: prompt.name, prompt_text: prompt.prompt_text })
  }

  function cancelForm() {
    setCreating(false)
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.prompt_text.trim()) return
    setSubmitting(true)
    try {
      if (editingId !== null) {
        await api.updateSystemPrompt(editingId, draft)
        toast.success("Prompt updated")
      } else {
        await api.createSystemPrompt(draft)
        toast.success("Prompt created")
      }
      await revalidate()
      cancelForm()
    } catch (err) {
      toast.error("Couldn't save prompt", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.deleteSystemPrompt(id)
      toast.success("Prompt deleted")
      await revalidate()
    } catch (err) {
      toast.error("Couldn't delete prompt", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setDeletingId(null)
    }
  }

  const formOpen = creating || editingId !== null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">System prompts</h2>
          <p className="text-xs text-muted-foreground">
            The full prompt library available to every user in the chat widget&apos;s prompt picker. Flip up to 3 of
            these on in the Quick Prompts tab to also show them as chips before a conversation starts.
          </p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={startCreate}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New prompt
          </Button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{editingId !== null ? "Edit prompt" : "New prompt"}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={cancelForm}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-name">Name</Label>
            <Input
              id="prompt-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Hospital footprint"
              className="bg-card"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-text">Prompt text</Label>
            <Textarea
              id="prompt-text"
              value={draft.prompt_text}
              onChange={(e) => setDraft((d) => ({ ...d, prompt_text: e.target.value }))}
              placeholder="e.g. How many hospitals and beds does this account operate?"
              rows={3}
              className="bg-card"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editingId !== null ? "Save changes" : "Create prompt"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {isLoading && systemPrompts.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && systemPrompts.length === 0 && (
          <p className="text-sm text-muted-foreground">No system prompts yet — add the first one above.</p>
        )}
        {systemPrompts.map((prompt) => (
          <div key={prompt.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{prompt.name}</span>
                {prompt.is_quick_prompt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Quick prompt
                  </span>
                )}
              </div>
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
    </div>
  )
}
