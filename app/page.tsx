import { AppShell } from "@/components/app-shell"
import { AdminPage } from "@/components/admin/admin-page"
import { RoleProvider } from "@/lib/role-context"

export default function Page() {
  return (
    <RoleProvider>
      <AppShell>
        <AdminPage />
      </AppShell>
    </RoleProvider>
  )
}
