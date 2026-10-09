"use client"

import { useState } from "react"
import { ChevronDown, Microscope, Settings, ShieldCheck, User, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import { AccountPicker } from "@/components/account-intelligence/account-picker"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Research configurations used to be a second top-level screen reachable
// from the sidebar; it's now reached only through the admin-only Settings
// button below, alongside the new prompt-management features — so this
// shell no longer needs multi-screen switching, just the one main view.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, setIsAdmin } = useRole()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-17 items-center gap-2.5 border-b px-6">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Account<span className="text-primary">360</span>
          </span>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-3">
          <span className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground">
            <Microscope className="size-4 shrink-0" aria-hidden="true" />
            Account intelligence
          </span>
        </nav>

        {isAdmin && (
          <div className="border-t p-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4 shrink-0" aria-hidden="true" />
              Settings
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-15 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-4">
            <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-muted-foreground">Account360</span>
              <span className="text-muted-foreground" aria-hidden="true">
                /
              </span>
              <span className="font-medium">Account intelligence</span>
            </nav>
            <AccountPicker />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="size-4" aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">Abbas, Sinan Sulaiman (Partner)</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Prototype controls</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(Boolean(checked))}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Token has research.admin role
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Turn this off to see the 401 state and hide the Settings button.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>

        <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
          {"© 2026 Philips My App | All Rights Reserved."}
        </footer>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
