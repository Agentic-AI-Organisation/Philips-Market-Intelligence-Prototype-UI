"use client"

import { useState } from "react"
import { CalendarClock, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import { SCHEDULING_ADMIN_ROLE } from "@/lib/admin-roles"
import { NoAccess } from "@/components/admin/no-access"
import { ResearchConfigurationsPanel } from "./research-configurations-panel"
import { SystemPromptsPanel } from "./system-prompts-panel"

// One entry per settings section. The source app routes these as
// /settings/research and /settings/system-prompts; the prototype has no
// router, so they're in-page sub-nav entries with the same ids/gating.
const SECTIONS = [
  { id: "research", label: "Research configurations", icon: CalendarClock },
  { id: "system-prompts", label: "System prompts", icon: MessageSquareText },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

// A full page, not a Dialog — Research Configurations already opens its own
// Sheets/Dialogs (schedule create/edit, confirmations), which would otherwise
// stack on top of a Settings *dialog*. Each section is gated by its own role:
// scheduling admin for research, chat admin for system prompts. The sidebar
// entry only shows when the user has at least one of them.
export function SettingsPage() {
  const { isAdmin, isChatAdmin } = useRole()
  const [requested, setRequested] = useState<SectionId | null>(null)

  const allowed = (id: SectionId) => (id === "research" ? isAdmin : isChatAdmin)
  const visible = SECTIONS.filter((s) => allowed(s.id))

  // Index redirect: land on research unless only chat admin; also fall back
  // when the open section's role is switched off.
  const section: SectionId =
    requested && allowed(requested) ? requested : (visible[0]?.id ?? "research")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <h1 className="text-lg font-semibold">Settings</h1>

      {visible.length === 0 ? (
        <NoAccess role={SCHEDULING_ADMIN_ROLE} />
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5 md:sticky md:top-21 md:w-56 md:shrink-0 md:flex-col"
          >
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRequested(item.id)}
                aria-current={section === item.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  section === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            {section === "research" && <ResearchConfigurationsPanel />}
            {section === "system-prompts" && <SystemPromptsPanel />}
          </div>
        </div>
      )}
    </div>
  )
}
