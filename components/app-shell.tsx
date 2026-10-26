"use client"

import { useState } from "react"
import { Building2, ChevronDown, ChevronsLeft, ChevronsRight, Home, Settings, ShieldCheck, User, Zap } from "lucide-react"
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

const currentYear = new Date().getUTCFullYear()

// Settings is a full top-level screen (see components/settings/settings-page.tsx).
// Home is still just a placeholder for a future screen and never navigates.
// Layout mirrors the source app: the shell fills the viewport, only <main>
// scrolls, and the slim footer flows at the end of the page content.
export function AppShell({ children, activeScreen, onNavigate }: AppShellProps) {
  const { isAdmin, setIsAdmin, isChatAdmin, setIsChatAdmin } = useRole()
  const [collapsed, setCollapsed] = useState(false)

  const navItem = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
      collapsed && "justify-center",
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  return (
    <div className="flex h-dvh bg-background">
      <aside
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r bg-card transition-[width] duration-200",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="absolute top-16 -right-3 z-10 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => onNavigate("accounts")}
          className={cn("flex h-14 items-center gap-2 border-b text-left", collapsed ? "justify-center px-2" : "px-5")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-[18px]" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="truncate text-base font-semibold tracking-tight whitespace-nowrap text-foreground">
              Account <span className="text-primary">intelligence</span>
            </span>
          )}
        </button>

        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
          <span
            aria-disabled="true"
            title={collapsed ? "Home" : "Coming soon"}
            className={cn(
              "flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/60",
              collapsed && "justify-center",
            )}
          >
            <Home className="size-[18px] shrink-0" aria-hidden="true" />
            {!collapsed && <span className="flex-1">Home</span>}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("accounts")}
            title={collapsed ? "Accounts" : undefined}
            aria-label="Accounts"
            className={navItem(activeScreen === "accounts")}
          >
            <Building2 className="size-[18px] shrink-0" aria-hidden="true" />
            {!collapsed && <span className="flex-1">Accounts</span>}
          </button>
        </nav>

        {(isAdmin || isChatAdmin) && (
          <div className="flex h-[53px] items-center border-t px-3">
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              title={collapsed ? "Settings" : undefined}
              aria-label="Settings"
              className={navItem(activeScreen === "settings")}
            >
              <Settings className="size-[18px] shrink-0" aria-hidden="true" />
              {!collapsed && "Settings"}
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-[100] flex h-14 shrink-0 items-center justify-end border-b bg-card px-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground/80 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
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
                  Scheduling admin role
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isChatAdmin}
                  onCheckedChange={(checked) => setIsChatAdmin(Boolean(checked))}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Chat admin role
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Each role gates its own Settings section. Turn both off to hide the Settings button.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
          {/* Footer flows at the end of the content; negative margins cancel
              main's p-6 so the bar stays edge-to-edge. */}
          <div className="-mx-6 -mb-6 mt-6">
            <footer className="border-t bg-background py-1.5">
              <p className="text-center text-xs text-muted-foreground">
                © {currentYear} Philips | All Rights Reserved.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
