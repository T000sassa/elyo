import { RoleProvider } from '@/contexts/RoleContext'
import { MitarbeiterShell } from './MitarbeiterShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <MitarbeiterShell>
        {children}
      </MitarbeiterShell>
    </RoleProvider>
  )
}
