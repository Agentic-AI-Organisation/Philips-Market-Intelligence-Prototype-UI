"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as api from "@/lib/mock-api"
import { useRevalidatePrompts, useSavedPrompts, useSystemPrompts } from "@/lib/use-prompts-data"

interface PromptLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Picking a prompt only fills the chat input — it never sends on the
  // caller's behalf, so the user can review/edit before sending themselves.
  onSelectPrompt: (text: string) => void
}

export function PromptLibraryDialog({ open, onOpenChange, onSelectPrompt }: PromptLibraryDialogProps) {
  const { systemPrompts } = useSystemPrompts()
  const { savedPrompts } = useSavedPrompts(api.CURRENT_USER)
  const revalidatePrompts = useRevalidatePrompts()
  const [query, setQuery] = useState("")
  const [addingSaved, setAddingSaved] = useState(false)
  const [newSavedText, setNewSavedText] = useState("")

  // Fresh state every time it's reopened, rather than resuming wherever it
  // was left (an in-progress "add" or a stale search from last time).
  useEffect(() => {
    if (open) {
      setQuery("")
      setAddingSaved(false)
      setNewSavedText("")
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const filteredSystemPrompts = systemPrompts.filter(
    (p) => p.name.toLowerCase().includes(q) || p.prompt_text.toLowerCase().includes(q),
  )
  const filteredSavedPrompts = savedPrompts.filter((p) => p.prompt_text.toLowerCase().includes(q))

  function selectPrompt(text: string) {
    onSelectPrompt(text)
    onOpenChange(false)
  }

  async function handleAddSaved() {
    const text = newSavedText.trim()
    if (!text) return
    try {
      await api.saveSavedPrompt(api.CURRENT_USER, text)
      setNewSavedText("")
      setAddingSaved(false)
      await revalidatePrompts()
    } catch (err) {
      toast.error("Couldn't save prompt", { description: err instanceof Error ? err.message : undefined })
    }
  }

  async function handleDeleteSaved(id: number) {
    try {
      await api.deleteSavedPrompt(id, api.CURRENT_USER)
      await revalidatePrompts()
    } catch (err) {
      toast.error("Couldn't remove prompt", { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-[90vw] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle>Prompt library</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="system" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex items-center gap-2 border-b p-3">
            <TabsList>
              <TabsTrigger value="system">System prompts</TabsTrigger>
              <TabsTrigger value="mine">My prompts</TabsTrigger>
            </TabsList>
          </div>

          <div className="relative px-3 pt-3">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts…"
              className="bg-card pl-9"
            />
          </div>

          <TabsContent value="system" className="min-h-0 flex-1 overflow-y-auto p-3">
            {filteredSystemPrompts.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {systemPrompts.length === 0 ? "No system prompts yet." : "No prompts match your search."}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredSystemPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => selectPrompt(prompt.prompt_text)}
                    className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="text-sm font-semibold">{prompt.name}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{prompt.prompt_text}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {addingSaved ? (
              <div className="flex items-start gap-1.5">
                <Input
                  value={newSavedText}
                  onChange={(e) => setNewSavedText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSaved()
                    }
                    if (e.key === "Escape") {
                      setAddingSaved(false)
                      setNewSavedText("")
                    }
                  }}
                  placeholder="Type a prompt to save…"
                  className="bg-card"
                  autoFocus
                />
                <Button size="icon" onClick={handleAddSaved} disabled={!newSavedText.trim()} aria-label="Save prompt">
                  <Plus aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setAddingSaved(false)
                    setNewSavedText("")
                  }}
                  aria-label="Cancel"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setAddingSaved(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add saved prompt
              </Button>
            )}

            {filteredSavedPrompts.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {savedPrompts.length === 0
                  ? "Nothing saved yet — bookmark a prompt from a conversation, or add one above."
                  : "No prompts match your search."}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredSavedPrompts.map((prompt) => (
                  <div key={prompt.id} className="group/item flex items-start gap-1 rounded-lg px-3 py-2.5 hover:bg-muted">
                    <button onClick={() => selectPrompt(prompt.prompt_text)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-2 text-sm">{prompt.prompt_text}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(prompt.id)}
                      aria-label="Remove saved prompt"
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
