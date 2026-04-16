import { RoleProvider } from '@/contexts/RoleContext'
import { AppShell } from '@/components/layout/AppShell'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AppShell>
        {children}
      </AppShell>
      <RoleSwitcher />
    </RoleProvider>
  )
}
