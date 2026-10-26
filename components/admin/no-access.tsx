import { Lock } from "lucide-react"
import { SCHEDULING_ADMIN_ROLE } from "@/lib/admin-roles"

// The source's AccessDeniedPanel — shown when the signed-in user lacks the
// role that gates a Settings section (or both of them).
export function NoAccess({ role = SCHEDULING_ADMIN_ROLE }: { role?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold">Restricted to administrators</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section requires the {role} role. Ask your administrator for access.
      </p>
    </div>
  )
}
