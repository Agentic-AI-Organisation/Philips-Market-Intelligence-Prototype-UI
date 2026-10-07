"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { useSWRConfig } from "swr"
import { setMockAdminRole } from "./mock-api"

interface RoleContextValue {
  isAdmin: boolean
  setIsAdmin: (value: boolean) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdminState] = useState(true)
  const { mutate } = useSWRConfig()

  const setIsAdmin = useCallback(
    (value: boolean) => {
      setMockAdminRole(value)
      setIsAdminState(value)
      mutate(() => true)
    },
    [mutate],
  )

  return <RoleContext.Provider value={{ isAdmin, setIsAdmin }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error("useRole must be used inside RoleProvider")
  return ctx
}
