"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import * as api from "@/lib/mock-api"
import { ApiError, type SystemPrompt } from "@/lib/types"
import { useRole } from "@/lib/role-context"
import { accessDeniedMessage, adminErrorMessage, isAccessDenied, SCHEDULING_ADMIN_ROLE } from "@/lib/admin-roles"
import { useAdminSystemPrompts, useRevalidateAdminPrompts } from "@/lib/use-system-prompts-admin"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { NoAccess } from "@/components/admin/no-access"

const QUICK_PROMPT_CAP = api.MAX_QUICK_PROMPTS

// Settings > System prompts (source: components/admin/SystemPromptsTab.tsx).
// Gated by the chat-admin role; the library is global, and up to three rows
// can be flagged as quick prompts for the chat widget's empty-state chips.
export function SystemPromptsPanel() {
  const { isChatAdmin } = useRole()
  const { prompts, error, isLoading } = useAdminSystemPrompts()
  const revalidate = useRevalidateAdminPrompts()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SystemPrompt | null>(null)
  const [deleting, setDeleting] = useState<SystemPrompt | null>(null)
  const [pendingQuick, setPendingQuick] = useState<Set<number>>(new Set())

  if (!isChatAdmin) return <NoAccess role={SCHEDULING_ADMIN_ROLE} />

  const quickCount = (prompts ?? []).filter((p) => p.is_quick_prompt).length

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: SystemPrompt) {
    setEditing(row)
    setFormOpen(true)
  }

  async function toggleQuick(row: SystemPrompt, enabled: boolean) {
    if (enabled && quickCount >= QUICK_PROMPT_CAP) {
      toast.warning("Quick prompt limit reached", { description: "Turn one off first." })
      return
    }
    setPendingQuick((prev) => new Set(prev).add(row.id))
    try {
      await api.setQuickPrompt(row.id, enabled)
      await revalidate()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.warning("Quick prompt limit reached", { description: "Turn one off first." })
      } else if (isAccessDenied(err)) {
        toast.error("You don't have admin access", { description: accessDeniedMessage(SCHEDULING_ADMIN_ROLE) })
      } else {
        toast.error("Couldn't update quick prompt", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
      await revalidate()
    } finally {
      setPendingQuick((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const row = deleting
    setDeleting(null)
    try {
      await api.deleteSystemPrompt(row.id)
      toast.success(`Deleted “${row.name}”`)
      await revalidate()
    } catch (err) {
      if (isAccessDenied(err)) {
        toast.error("You don't have admin access", { description: accessDeniedMessage(SCHEDULING_ADMIN_ROLE) })
      } else {
        toast.error("Couldn't delete prompt", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
      await revalidate()
    }
  }

  return (
    <section aria-labelledby="system-prompts-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 id="system-prompts-heading" className="font-semibold">
            System prompts
          </h2>
          <p className="text-xs text-muted-foreground">
            <span
              className={cn(
                quickCount >= QUICK_PROMPT_CAP
                  ? "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset"
                  : "font-medium text-foreground",
              )}
            >
              {quickCount}/{QUICK_PROMPT_CAP} quick prompts selected
            </span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          New prompt
        </Button>
      </div>

      {error && (!prompts || prompts.length === 0) ? (
        <p role="alert" className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-destructive">
          {"Couldn't load system prompts. "}
          {adminErrorMessage(error, "Failed to load system prompts")}
        </p>
      ) : isLoading && !prompts ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : prompts?.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MessageSquarePlus className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">No system prompts yet</p>
          <Button variant="outline" onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New prompt
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {prompts?.map((row) => (
            <li key={row.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <label className="mr-1 inline-flex items-center gap-1.5">
                    <Switch
                      checked={row.is_quick_prompt}
                      disabled={pendingQuick.has(row.id)}
                      onCheckedChange={(checked) => toggleQuick(row, checked)}
                      aria-label={`Quick prompt for ${row.name}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {pendingQuick.has(row.id) ? "Saving…" : "Quick prompt"}
                    </span>
                  </label>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(row)}
                    aria-label={`Delete ${row.name}`}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{row.prompt_text}</p>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          {formOpen && (
            <PromptForm
              key={editing?.id ?? "new"}
              editing={editing}
              onCancel={() => setFormOpen(false)}
              onSaved={async () => {
                await revalidate()
                setFormOpen(false)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        confirmLabel="Delete prompt"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>This removes the prompt outright, there&apos;s no undo. Chats already sent are unaffected.</p>
      </ConfirmDialog>
    </section>
  )
}

function PromptForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing: SystemPrompt | null
  onCancel: () => void
  onSaved: () => Promise<void> | void
}) {
  const isEdit = editing !== null
  const [name, setName] = useState(editing?.name ?? "")
  const [promptText, setPromptText] = useState(editing?.prompt_text ?? "")
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const nameInvalid = showErrors && !name.trim()
  const textInvalid = showErrors && !promptText.trim()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (!name.trim() || !promptText.trim()) return
    setSubmitting(true)
    setServerError(null)
    try {
      if (editing) {
        // Partial update — send only what changed.
        const payload: { name?: string; prompt_text?: string } = {}
        if (name.trim() !== editing.name) payload.name = name.trim()
        if (promptText.trim() !== editing.prompt_text) payload.prompt_text = promptText.trim()
        if (Object.keys(payload).length > 0) await api.updateSystemPrompt(editing.id, payload)
        toast.success("Prompt updated")
      } else {
        await api.createSystemPrompt({ name: name.trim(), prompt_text: promptText.trim() })
        toast.success("Prompt created")
      }
      await onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("This prompt no longer exists")
        await onSaved()
      } else if (isAccessDenied(err)) {
        setServerError(accessDeniedMessage(SCHEDULING_ADMIN_ROLE))
      } else {
        setServerError(err instanceof Error ? err.message : "Something went wrong.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full min-h-0 flex-col">
      <SheetHeader className="shrink-0 border-b p-5 pr-12">
        <SheetTitle className="text-base">{isEdit ? "Edit system prompt" : "New system prompt"}</SheetTitle>
        <SheetDescription className="sr-only">
          {isEdit ? "Edit this prompt's name and text." : "Add a prompt to the system library."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setServerError(null)
            }}
            placeholder="e.g. Hospital & bed footprint"
            maxLength={200}
            aria-invalid={nameInvalid || undefined}
            className="h-9 bg-card"
          />
          {nameInvalid && <p className="text-xs text-destructive">Give the prompt a name.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt-text">Prompt text</Label>
          <Textarea
            id="prompt-text"
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

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create prompt"}
          </Button>
        </div>
      </div>
    </form>
  )
}
