"use client"

import { createContext, useContext, useRef, type ReactNode } from "react"
import { createChatStore, type ChatStore } from "./chat-store"

const ChatStoreContext = createContext<ChatStore | undefined>(undefined)

/**
 * App-lifetime chat storage. PanelChat mounts per account/page, so anything
 * kept in its own refs dies on navigation — this store survives it. Identity
 * is stable, so providing it never re-renders anyone by itself.
 */
export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ChatStore | null>(null)
  if (!storeRef.current) storeRef.current = createChatStore()
  return <ChatStoreContext.Provider value={storeRef.current}>{children}</ChatStoreContext.Provider>
}

export function useChatStore(): ChatStore {
  const store = useContext(ChatStoreContext)
  if (!store) throw new Error("useChatStore must be used within a ChatStoreProvider")
  return store
}
