"use client"

import { useState } from "react"
import { CalendarClock, MessageSquareText, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ResearchConfigurationsPanel } from "./research-configurations-panel"
import { SystemPromptsPanel } from "./system-prompts-panel"
import { QuickPromptsPanel } from "./quick-prompts-panel"

const SECTIONS = [
  { id: "research-configurations", label: "Research configurations", icon: CalendarClock },
  { id: "system-prompts", label: "System prompts", icon: MessageSquareText },
  { id: "quick-prompts", label: "Quick prompts", icon: Sparkles },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Admin-only. Reached via the Settings button at the bottom of the sidebar
// (see app-shell.tsx) rather than its own top-level nav item — "Research
// configurations" used to be a full standalone screen; it's now just one
// section in here, alongside the two new prompt-management features.
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [section, setSection] = useState<SectionId>("research-configurations")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[95vw]">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="flex w-52 shrink-0 flex-col gap-1 border-r p-2">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={section === item.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  section === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-5">
            {section === "research-configurations" && <ResearchConfigurationsPanel />}
            {section === "system-prompts" && <SystemPromptsPanel />}
            {section === "quick-prompts" && <QuickPromptsPanel />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
