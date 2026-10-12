"use client"

import { useEffect, useState } from "react"
import { Search, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as api from "@/lib/mock-api"
import { useSavedPrompts, useSystemPrompts } from "@/lib/use-prompts-data"
import { ManagePromptsDialog } from "@/components/account-intelligence/manage-prompts-dialog"

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
  const [query, setQuery] = useState("")
  const [manageOpen, setManageOpen] = useState(false)

  // Fresh search every time it's reopened, rather than resuming a stale
  // query from last time.
  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  const q = query.trim().toLowerCase()
  const filteredSystemPrompts = systemPrompts.filter(
    (p) => p.name.toLowerCase().includes(q) || p.prompt_text.toLowerCase().includes(q),
  )
  const filteredSavedPrompts = savedPrompts.filter(
    (p) => p.name.toLowerCase().includes(q) || p.prompt_text.toLowerCase().includes(q),
  )

  function selectPrompt(text: string) {
    onSelectPrompt(text)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[70vh] max-w-[90vw] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-center justify-between border-b p-4 pr-10 pb-3 space-y-0">
          <DialogTitle>Prompt library</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              setManageOpen(true)
            }}
          >
            <Settings2 data-icon="inline-start" aria-hidden="true" />
            Manage prompts
          </Button>
        </DialogHeader>

        <Tabs defaultValue="system" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex items-center gap-2 border-b p-3">
            <TabsList>
              <TabsTrigger value="system">System prompts</TabsTrigger>
              <TabsTrigger value="saved">Saved prompts</TabsTrigger>
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

          <TabsContent value="saved" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <p className="px-1 text-xs text-muted-foreground">
              {savedPrompts.length} / {api.MAX_SAVED_PROMPTS} saved
            </p>
            {filteredSavedPrompts.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {savedPrompts.length === 0
                  ? "Nothing saved yet — bookmark a prompt from a conversation to add one."
                  : "No prompts match your search."}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredSavedPrompts.map((prompt) => (
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
        </Tabs>
      </DialogContent>
    </Dialog>
    <ManagePromptsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </>
  )
}
