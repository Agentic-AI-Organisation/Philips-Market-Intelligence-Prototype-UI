"use client"

import { useState } from "react"
import { CalendarClock, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResearchConfigurationsPanel } from "./research-configurations-panel"
import { SystemPromptsPanel } from "./system-prompts-panel"

const SECTIONS = [
  { id: "research-configurations", label: "Research configurations", icon: CalendarClock },
  { id: "system-prompts", label: "System prompts", icon: MessageSquareText },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

// A full page, not a Dialog — Research Configurations already opens its own
// Sheets/Dialogs (schedule create/edit, delete confirmation), which would
// otherwise stack on top of a Settings *dialog* (modal-on-modal). As a page,
// those stay normal single-level overlays, and the content gets the full
// viewport width instead of a dialog's max-width budget.
export function SettingsPage() {
  const [section, setSection] = useState<SectionId>("research-configurations")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="flex min-w-0 flex-1 flex-col gap-5 md:flex-row">
        <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors",
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

        <div className="min-w-0 flex-1">
          {section === "research-configurations" && <ResearchConfigurationsPanel />}
          {section === "system-prompts" && <SystemPromptsPanel />}
        </div>
      </div>
    </div>
  )
}
