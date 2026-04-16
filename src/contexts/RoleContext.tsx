'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type DemoRole = 'employee' | 'admin' | 'partner'

interface RoleContextValue {
  role: DemoRole
  setRole: (role: DemoRole) => void
}

const RoleContext = createContext<RoleContextValue>({
  role: 'employee',
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DemoRole>('employee')
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
