import type { ReactNode } from "react"
import { MapPin } from "lucide-react"
import type { Account } from "@/lib/types"

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

function locationLabel(location: Account["location"] | undefined): string | null {
  if (!location) return null
  const parts = [location.city, location.region || location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

export function AccountHeader({
  account,
  tabs,
}: {
  account: Account
  /** Rendered as the header card's bottom strip (section tabs), so they read
   * as one surface with the identity row. */
  tabs?: ReactNode
}) {
  const location = locationLabel(account.location)

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
          {initial(account.hospital_name)}
        </div>
        <div>
          <h1 className="text-lg font-semibold">{account.hospital_name}</h1>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>
      </div>
      {tabs && <div className="px-4">{tabs}</div>}
    </div>
  )
}
