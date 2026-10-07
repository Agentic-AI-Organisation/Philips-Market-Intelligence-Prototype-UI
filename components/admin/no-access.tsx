import { ShieldAlert } from "lucide-react"

export function NoAccess() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">{"You don't have admin access"}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Research scheduling requires the <code className="rounded bg-muted px-1 py-0.5 text-xs">research.admin</code>{" "}
          role. Ask your Account360 administrator to grant it, then sign in again.
        </p>
      </div>
    </div>
  )
}
