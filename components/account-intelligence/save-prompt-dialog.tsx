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
  const revalidatePrompts = useRevalidatePrompts()

  useEffect(() => {
    if (open) {
      setName("")
      setText(initialText)
    }
  }, [open, initialText])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !text.trim()) return
    setSubmitting(true)
    try {
      await api.saveSavedPrompt(api.CURRENT_USER, name, text)
      toast.success("Saved to Saved Prompts")
      await revalidatePrompts()
      onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save prompt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="save-prompt-name">Name</Label>
            <Input
              id="save-prompt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quarterly financial summary"
              className="bg-card"
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="save-prompt-text">Prompt</Label>
            <Textarea
              id="save-prompt-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="bg-card"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim() || !text.trim()}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
