"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as api from "@/lib/mock-api"
import { ApiError } from "@/lib/types"
import { useRevalidatePrompts } from "@/lib/use-prompts-data"

interface SavePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The message text that triggered this (pre-fills the prompt field, but
  // stays editable — bookmarking isn't a verbatim save, the user may want
  // to generalize or clean the wording up before keeping it).
  initialText: string
}

// Opened from the bookmark icon on a user message — saving to Saved
// Prompts is a deliberate, named action (like a system prompt), not a
// silent one-click toggle, so the user gets a chance to title and edit it.
export function SavePromptDialog({ open, onOpenChange, initialText }: SavePromptDialogProps) {
  const [name, setName] = useState("")
  const [text, setText] = useState(initialText)
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const revalidatePrompts = useRevalidatePrompts()

  useEffect(() => {
    if (open) {
      setName("")
      setText(initialText)
      setShowErrors(false)
      setServerError(null)
    }
  }, [open, initialText])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (!name.trim() || !text.trim()) return
    setSubmitting(true)
    setServerError(null)
    try {
      await api.saveSavedPrompt(api.CURRENT_USER, name.trim(), text.trim())
      toast.success("Prompt saved")
      await revalidatePrompts()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError("Saved prompt limit reached. Delete one first.")
      } else {
        setServerError(err instanceof Error ? err.message : "Something went wrong.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save prompt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="save-prompt-name">Name</Label>
            <Input
              id="save-prompt-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setServerError(null)
              }}
              placeholder="e.g. Quarterly financial summary"
              maxLength={200}
              aria-invalid={(showErrors && !name.trim()) || undefined}
              className="bg-card"
              autoFocus
            />
            {showErrors && !name.trim() && <p className="text-xs text-destructive">Give the prompt a name.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="save-prompt-text">Prompt</Label>
            <Textarea
              id="save-prompt-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setServerError(null)
              }}
              rows={4}
              aria-invalid={(showErrors && !text.trim()) || undefined}
              className="bg-card leading-relaxed"
            />
            {showErrors && !text.trim() && <p className="text-xs text-destructive">Prompt text can&apos;t be empty.</p>}
          </div>
          {serverError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
