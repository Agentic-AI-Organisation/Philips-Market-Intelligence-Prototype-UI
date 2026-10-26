import { ApiError, type ChatResponse, type ChatSource } from "./types"
import { getMockChatResponseForSource, type ChatDataSource } from "./mock-chat-responses"

// Mock stand-in for chatquery-api (/chat-history, /chat-history/refresh,
// /query). Keeps a per-(user, account) server-side thread so history is
// restored after a reload (persisted to localStorage), independent of the
// client-side chat store that only survives in-app navigation.

export interface MockHistoryMessage {
  role: "user" | "assistant"
  content: string
  created_at: string
  metadata?: { sources?: ChatSource[] }
}

export interface MockHistoryResponse {
  chat_id: string | null
  messages: MockHistoryMessage[]
}

interface Thread {
  chat_id: string
  messages: MockHistoryMessage[]
}

const STORAGE_KEY = "mock-chat-history-v1"
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let threads: Map<string, Thread> | null = null

function threadKey(accountId: string, userId: string) {
  return `${userId}::${accountId}`
}

function load(): Map<string, Thread> {
  if (threads) return threads
  const loaded = new Map<string, Thread>()
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Thread>)) loaded.set(k, v)
  } catch {
    // unreadable storage — start with an empty server
  }
  threads = loaded
  return loaded
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(load())))
  } catch {
    // storage unavailable — in-memory only
  }
}

// Test hooks: flip to simulate the chat service being down.
export const mockChatFailures = { history: false, refresh: false, query: false }

export async function getChatHistory(
  accountId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<MockHistoryResponse> {
  await delay(450)
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  if (mockChatFailures.history) throw new ApiError(503, "The chat service is currently down.")
  const thread = load().get(threadKey(accountId, userId))
  return thread ? structuredClone(thread) : { chat_id: null, messages: [] }
}

export async function refreshChatHistory(accountId: string, userId: string): Promise<{ status: string }> {
  await delay(500)
  if (mockChatFailures.refresh) throw new ApiError(503, "Failed to start new chat.")
  load().delete(threadKey(accountId, userId))
  persist()
  return { status: "ok" }
}

export interface ChatQueryPayload {
  account_id: string
  query: string
  user_id: string
  session_id: string
  chat_id: string
  data_sources: ChatDataSource[]
}

export async function postChatQuery(payload: ChatQueryPayload): Promise<ChatResponse> {
  await delay(1100)
  if (mockChatFailures.query || /simulate error/i.test(payload.query)) {
    throw new ApiError(503, "The assistant couldn't complete that request. Please try again.")
  }
  const response = structuredClone(
    getMockChatResponseForSource(payload.account_id, payload.query, payload.data_sources[0] ?? "external"),
  )
  const key = threadKey(payload.account_id, payload.user_id)
  const thread = load().get(key) ?? { chat_id: payload.chat_id, messages: [] }
  const now = Date.now()
  thread.messages.push(
    { role: "user", content: payload.query, created_at: new Date(now).toISOString() },
    {
      role: "assistant",
      content: response.answer,
      created_at: new Date(now + 1).toISOString(),
      metadata: { sources: response.sources },
    },
  )
  load().set(key, thread)
  persist()
  return response
}
