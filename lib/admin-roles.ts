import { ApiError } from "./types"

// Mirrors the real app's utils/adminRole.ts. The real app derives the booleans
// from the research-api token's roles claim; here they come from role-context
// (two toggles in the prototype's user menu).
export const SCHEDULING_ADMIN_ROLE = "research.admin"

export function isAccessDenied(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401
}

/**
 * A signed-in-but-non-admin user is a normal case, not a bug — say so
 * instead of surfacing the raw backend message.
 */
export function accessDeniedMessage(role: string = SCHEDULING_ADMIN_ROLE): string {
  return `You don't have admin access. Ask your administrator for the ${role} role.`
}

/** Error text for a failed admin request: access-denied copy, else the message. */
export function adminErrorMessage(err: unknown, fallback: string): string {
  if (isAccessDenied(err)) return accessDeniedMessage()
  return err instanceof Error ? err.message : fallback
}
