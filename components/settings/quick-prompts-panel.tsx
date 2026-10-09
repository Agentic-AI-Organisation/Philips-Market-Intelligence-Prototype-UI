"use client"

import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as api from "@/lib/mock-api"
import { ApiError } from "@/lib/types"
import { useRevalidatePrompts, useSystemPrompts } from "@/lib/use-prompts-data"

const MAX_QUICK_PROMPTS = 3

export function QuickPromptsPanel() {
  const { systemPrompts, isLoading } = useSystemPrompts()
  const revalidate = useRevalidatePrompts()
  const activeCount = systemPrompts.filter((p) => p.is_quick_prompt).length

  async function toggle(id: number, enabled: boolean) {
    try {
      await api.setQuickPrompt(id, enabled)
      await revalidate()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Only 3 quick prompts allowed", { description: err.message })
      } else {
        toast.error("Couldn't update quick prompt", { description: err instanceof Error ? err.message : undefined })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold">Quick prompts</h2>
        <p className="text-xs text-muted-foreground">
          Pick up to {MAX_QUICK_PROMPTS} prompts from the system prompts library to show as chips in the chat
          widget before a conversation starts. Everything else stays available in the full prompt picker.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            activeCount >= MAX_QUICK_PROMPTS ? "bg-accent text-accent-foreground" : "bg-muted",
          )}
        >
          {activeCount} / {MAX_QUICK_PROMPTS} selected
        </span>
        {activeCount >= MAX_QUICK_PROMPTS && <span>Turn one off before adding another.</span>}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && systemPrompts.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && systemPrompts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No system prompts yet — add some in the System Prompts tab first.
          </p>
        )}
        {systemPrompts.map((prompt) => {
          const disableToggleOn = !prompt.is_quick_prompt && activeCount >= MAX_QUICK_PROMPTS
          return (
            <label
              key={prompt.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg border bg-card p-3",
                disableToggleOn && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{prompt.name}</span>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{prompt.prompt_text}</p>
              </div>
              <Switch
                checked={prompt.is_quick_prompt}
                disabled={disableToggleOn}
                onCheckedChange={(checked) => toggle(prompt.id, checked)}
                aria-label={`${prompt.is_quick_prompt ? "Remove" : "Add"} ${prompt.name} as a quick prompt`}
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}
