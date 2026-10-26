import type { ChatSource } from "./types"

export interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  sources?: ChatSource[]
  error?: boolean
  action?: "refresh-chat" | "retry-refresh"
}

/** Upper bound per account thread; keeps long sessions flat in memory. */
export const CHAT_CACHE_CAP = 200

export class CappedMessageMap extends Map<string, ChatMessage[]> {
  override set(key: string, value: ChatMessage[]): this {
    super.set(key, value.length > CHAT_CACHE_CAP ? value.slice(-CHAT_CACHE_CAP) : value)
    return this
  }
}

export interface ChatStore {
  /** Confirmed per-account threads (server history merged with local). */
  messageCache: Map<string, ChatMessage[]>
  /** Asked-but-unanswered user messages, per account. */
  pendingMessages: Map<string, ChatMessage[]>
  /** Account IDs with a query currently in flight. */
  pendingRequests: Set<string>
  chatIds: Map<string, string>
  sessionIds: Map<string, string>
  /**
   * Re-render subscriber. Containers are mutated outside React (and the
   * mutating PanelChat instance may have unmounted — e.g. send on A, switch
   * to B, response lands while B is mounted), so every mutation that
   * affects rendered state must be followed by notify().
   */
  subscribe(fn: () => void): () => void
  /** Wake all subscribers after mutating any container. */
  notify(): void
}

export function createChatStore(): ChatStore {
  const listeners = new Set<() => void>()
  return {
    messageCache: new CappedMessageMap(),
    pendingMessages: new Map(),
    pendingRequests: new Set(),
    chatIds: new Map(),
    sessionIds: new Map(),
    subscribe: (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    notify: () => listeners.forEach((fn) => fn()),
  }
}

export interface MergeableMessage {
  id: string
  isUser: boolean
  text: string
}

function messageKey(message: MergeableMessage): string {
  const role = message.isUser ? "user" : "assistant"
  const text = message.text.replace(/\\n/g, "\n").trim().replace(/\s+/g, " ").toLowerCase()
  return `${role}::${text}`
}

/**
 * Union of server history with locally-known messages. The server is the
 * source of order and identity; anything the server doesn't list yet (a run
 * that completed while the client was on another account, a write still
 * propagating) is appended instead of dropped — a lagging server response
 * must never delete confirmed local data. Once the server catches up, the
 * normalized match collapses both sides into one row (no duplicates).
 */
export function mergeHistory<T extends MergeableMessage>(server: T[], local: T[]): T[] {
  const seen = new Set(server.map(messageKey))
  const extras = local.filter((message) => !seen.has(messageKey(message)))
  return [...server, ...extras]
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
