"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { useSWRConfig } from "swr"
import { setMockAdminRole, setMockChatAdminRole } from "./mock-api"

interface RoleContextValue {
  /** Scheduling admin (Research configurations). */
  isAdmin: boolean
  setIsAdmin: (value: boolean) => void
  /** Chat admin (System prompts). */
  isChatAdmin: boolean
  setIsChatAdmin: (value: boolean) => void
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

  const [isChatAdmin, setIsChatAdminState] = useState(true)
  const setIsChatAdmin = useCallback(
    (value: boolean) => {
      setMockChatAdminRole(value)
      setIsChatAdminState(value)
      mutate(() => true)
    },
    [mutate],
  )

  return (
    <RoleContext.Provider value={{ isAdmin, setIsAdmin, isChatAdmin, setIsChatAdmin }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error("useRole must be used inside RoleProvider")
  return ctx
}
