"use client"

import { CalendarClock, ChevronDown, FlaskConical, ShieldCheck, User, Zap } from "lucide-react"
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, setIsAdmin } = useRole()

  const navItems = [
    { label: "Account intelligence", icon: FlaskConical, href: "#", active: false },
    ...(isAdmin
      ? [{ label: "Research scheduling", icon: CalendarClock, href: "#", active: true }]
      : []),
  ]

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
        <nav aria-label="Main" className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-15 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground" aria-hidden="true">
              /
            </span>
            <span className="font-medium">Research scheduling</span>
          </nav>

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
                Turn this off to see the 401 state and the hidden nav item.
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
