"use client"

import { Building2, ChevronDown, Home, Settings, ShieldCheck, User, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/lib/role-context"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type TopLevelScreen = "accounts" | "settings"

interface AppShellProps {
  children: React.ReactNode
  activeScreen: TopLevelScreen
  onNavigate: (screen: TopLevelScreen) => void
}

// Settings is a full top-level screen (see components/settings/settings-page.tsx),
// not a popup — it used to be a Dialog, but Research Configurations already
// opens its own Sheets/Dialogs (schedule create/edit, delete confirmation),
// which stacked awkwardly on top of a Settings dialog. Home is still just a
// placeholder for a future screen and never navigates.
export function AppShell({ children, activeScreen, onNavigate }: AppShellProps) {
  const { isAdmin, setIsAdmin } = useRole()

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
          <span
            aria-disabled="true"
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
          >
            <Home className="size-4 shrink-0" aria-hidden="true" />
            Home
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Soon
            </span>
          </span>
          <button
            type="button"
            onClick={() => onNavigate("accounts")}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              activeScreen === "accounts"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Building2 className="size-4 shrink-0" aria-hidden="true" />
            Accounts
          </button>
        </nav>

        {isAdmin && (
          <div className="border-t p-3">
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                activeScreen === "settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
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
              <span className="font-medium">{activeScreen === "settings" ? "Settings" : "Accounts"}</span>
            </nav>
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
    </div>
  )
}
