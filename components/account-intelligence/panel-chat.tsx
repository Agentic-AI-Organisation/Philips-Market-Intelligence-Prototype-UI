"use client"

import { useState, useRef, useEffect, useCallback, useReducer, Fragment } from "react"
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Bot,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sparkles,
  MessageCircle,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Library,
} from "lucide-react"
import { toast } from "sonner"
import * as api from "@/lib/mock-api"
import * as chatApi from "@/lib/mock-chat-api"
import type { ChatDataSource } from "@/lib/mock-chat-responses"
import { useAccountContext } from "@/lib/account-context"
import { useChatStore } from "@/lib/chat-store-context"
import { generateSessionId, mergeHistory, type ChatMessage } from "@/lib/chat-store"
import { useQuickPrompts, useRevalidatePrompts, useSavedPrompts } from "@/lib/use-prompts-data"
import { ChatMarkdown } from "./chat-markdown"
import { PromptLibraryDialog } from "./prompt-library-dialog"
import { SavePromptDialog } from "./save-prompt-dialog"

const MAX_REFRESH_RETRIES = 3

function makeGreeting(): ChatMessage {
  return {
    id: "1",
    text: "Hello! I'm your AI research assistant. Ask me anything about the selected account.",
    isUser: false,
    timestamp: new Date(),
  }
}

function unescapeNewlines(text: string): string {
  return text.replace(/\\n/g, "\n")
}

const DATA_SOURCES: ChatDataSource[] = ["external", "seismic"]

// Ported from itaap-commercialit-account-intelligence-ui's PanelChat: the
// conversation lives in an app-lifetime chat store (see lib/chat-store.ts)
// so it survives navigating between accounts/pages, the loading indicator
// is derived from that shared store, and stale completions (a reply or
// history fetch for an account the user has since left) are dropped from
// the visible thread and parked in the store's cache instead. The network
// layer is mocked by lib/mock-chat-api.ts.
export function PanelChat() {
  const { selectedAccountId } = useAccountContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeGreeting()])
  const [inputValue, setInputValue] = useState("")
  // Derived from the shared store, NOT local state: the instance that sent
  // a query may have unmounted (account switch), so a completion must clear
  // the dots on whichever instance is mounted now. Mutations to
  // pendingRequests are always followed by notify(), which re-renders here.
  const { messageCache, pendingMessages, pendingRequests, chatIds, sessionIds, notify, subscribe } = useChatStore()
  const [tick, bumpTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribe(bumpTick), [subscribe])
  const isLoading = selectedAccountId !== null && pendingRequests.has(selectedAccountId)

  // A completion that ran on an unmounted instance (send on A, switch away,
  // response lands while B is mounted) can only persist to the shared
  // cache — its setMessages is discarded. On every store notification, fold
  // newly cached rows into this instance's view. mergeHistory dedupes, and
  // we keep the previous reference when nothing new arrived (no churn).
  useEffect(() => {
    if (!selectedAccountId) return
    const cached = messageCache.get(selectedAccountId)
    if (!cached || cached.length === 0) return
    setMessages((prev) => {
      const merged = mergeHistory(prev, cached)
      return merged.length === prev.length ? prev : merged
    })
  }, [tick, selectedAccountId, messageCache])

  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [showPrompts, setShowPrompts] = useState(true)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [saveDialogText, setSaveDialogText] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<ChatDataSource>("external")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const selectedAccountIdRef = useRef(selectedAccountId)
  const refreshRetryCountRef = useRef<Map<string, number>>(new Map())

  const { data: quickPrompts, isLoading: quickPromptsLoading } = useQuickPrompts()
  const { savedPrompts } = useSavedPrompts(api.CURRENT_USER)
  const revalidatePrompts = useRevalidatePrompts()

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId
  }, [selectedAccountId])

  useEffect(() => {
    if (!selectedAccountId) return

    // This effect re-runs per account, but an already-resolved fetch can't
    // be aborted — without this capture, a slow A-response landing after a
    // fast A->B switch paints A's full thread into B's window (stuck).
    const effectAccountId = selectedAccountId

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsRefreshing(false)
    setIsHistoryLoading(true)
    // Unsent drafts belong to the account they were typed on — never carry
    // one into another account's box (wrong-account sends).
    setInputValue("")
    setMessages([makeGreeting()])
    setExpandedSources(new Set())
    setShowPrompts(false)
    if (!chatIds.has(selectedAccountId)) chatIds.set(selectedAccountId, crypto.randomUUID())
    if (!sessionIds.has(selectedAccountId)) sessionIds.set(selectedAccountId, generateSessionId())

    const fetchChatHistory = async () => {
      try {
        const data = await chatApi.getChatHistory(selectedAccountId, api.CURRENT_USER, signal)

        // Abort misses already-resolved responses — drop stale completions
        // instead of painting another account's thread into this view.
        if (selectedAccountIdRef.current !== effectAccountId) return

        if (data.chat_id) chatIds.set(selectedAccountId, data.chat_id)

        if (data.messages.length > 0) {
          const mapped: ChatMessage[] = data.messages.map((msg, index) => ({
            id: `history-${index}`,
            text: unescapeNewlines(msg.content),
            isUser: msg.role === "user",
            timestamp: new Date(msg.created_at),
            sources: msg.role === "assistant" ? msg.metadata?.sources : undefined,
          }))
          const localKnown = messageCache.get(selectedAccountId) ?? []
          // Union, never overwrite: server rows first, then anything we
          // locally confirmed that the server doesn't list yet.
          const next = mergeHistory(mapped, localKnown)
          setMessages(next)
          messageCache.set(selectedAccountId, next)
          setShowPrompts(false)
        } else {
          const merged = mergeHistory([], messageCache.get(selectedAccountId) ?? [])
          if (merged.length > 0) {
            setMessages(merged)
            messageCache.set(selectedAccountId, merged)
            setShowPrompts(false)
          } else {
            setMessages([makeGreeting()])
            setShowPrompts(true)
          }
        }
        setIsHistoryLoading(false)
      } catch {
        setIsHistoryLoading(false)
        if (signal.aborted) return
        // Same staleness guard: a "service down" bubble for A must never
        // land in B's window either.
        if (selectedAccountIdRef.current !== effectAccountId) return
        refreshRetryCountRef.current.set(selectedAccountId, 0)
        setMessages([
          {
            id: "history-error",
            text: "The chat service is currently down. Please try again later.",
            isUser: false,
            timestamp: new Date(),
            error: true,
            action: "refresh-chat",
          },
        ])
        setShowPrompts(false)
      }
    }

    void fetchChatHistory()

    return () => {
      abortControllerRef.current?.abort()
      setIsHistoryLoading(false)
    }
  }, [selectedAccountId, chatIds, messageCache, sessionIds])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // Grows the input with its content, up to ~3 lines (max-h-20 below) —
  // past that, it scrolls internally instead of growing further. Keyed on
  // inputValue (not a native onInput handler) so this also fires when text
  // is set programmatically — a quick-prompt chip or a library pick.
  //
  // Empty input clears the inline height instead of measuring scrollHeight,
  // so the resting size always falls back to the min-h-11 CSS class exactly
  // — measuring here would be unreliable right after the panel opens, since
  // its own width is still mid-transition.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    if (!inputValue) {
      el.style.height = ""
      return
    }
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 80) + "px"
  }, [inputValue])

  function toggleSourceExpansion(messageId: string) {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  async function handleSend(text: string) {
    if (!text.trim() || !selectedAccountId) return

    const requestAccountId = selectedAccountId
    const requestDataSource = dataSource
    const requestSessionId = sessionIds.get(requestAccountId) ?? generateSessionId()
    const requestChatId = chatIds.get(requestAccountId) ?? crypto.randomUUID()

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev.filter((m) => !m.action), userMessage])
    const filteredCache = (messageCache.get(requestAccountId) ?? []).filter((m) => !m.action)
    messageCache.set(requestAccountId, [...filteredCache, userMessage])
    setInputValue("")
    setShowPrompts(false)
    pendingRequests.add(requestAccountId)
    // Wake every mounted instance so the derived isLoading re-renders —
    // the completing instance may have unmounted (account switch).
    notify()

    pendingMessages.set(requestAccountId, [...(pendingMessages.get(requestAccountId) ?? []), userMessage])

    try {
      const data = await chatApi.postChatQuery({
        account_id: requestAccountId,
        query: text.trim(),
        user_id: api.CURRENT_USER,
        session_id: requestSessionId,
        chat_id: requestChatId,
        data_sources: [requestDataSource],
      })

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: unescapeNewlines(data.answer),
        isUser: false,
        timestamp: new Date(),
        sources: data.sources,
      }
      messageCache.set(requestAccountId, [...(messageCache.get(requestAccountId) ?? []), botMessage])
      // Another account is mounted now: no setMessages — the mounted
      // instance folds this row in via the notify-driven merge above.
      if (requestAccountId !== selectedAccountIdRef.current) return
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "Failed to get response. Please try again.",
        isUser: false,
        timestamp: new Date(),
        error: true,
      }
      messageCache.set(requestAccountId, [...(messageCache.get(requestAccountId) ?? []), errorMessage])
      if (requestAccountId !== selectedAccountIdRef.current) return
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      pendingRequests.delete(requestAccountId)
      const pendingList = pendingMessages.get(requestAccountId)
      if (pendingList) {
        const idx = pendingList.findIndex((m) => m.id === userMessage.id)
        if (idx >= 0) pendingList.splice(idx, 1)
        if (pendingList.length === 0) pendingMessages.delete(requestAccountId)
      }
      // Clearing the Set is not a React state update, so wake subscribers:
      // the mounted instance re-derives isLoading, even if this completion
      // ran on an instance that has since unmounted (account switch).
      notify()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend(inputValue)
    }
  }

  async function handleReset() {
    if (isRefreshing || isLoading || isHistoryLoading) return
    if (selectedAccountId) {
      pendingRequests.delete(selectedAccountId)
      pendingMessages.delete(selectedAccountId)
      messageCache.delete(selectedAccountId)
      notify()
    }

    const requestAccountId = selectedAccountId
    setIsRefreshing(true)
    try {
      await chatApi.refreshChatHistory(selectedAccountId ?? "", api.CURRENT_USER)
      if (requestAccountId !== selectedAccountIdRef.current) return

      if (requestAccountId) {
        chatIds.set(requestAccountId, crypto.randomUUID())
        sessionIds.set(requestAccountId, generateSessionId())
      }
      setMessages([makeGreeting()])
      setExpandedSources(new Set())
      setShowPrompts(true)
    } catch {
      if (requestAccountId !== selectedAccountIdRef.current) return
      toast.error("Couldn't start a new chat", { description: "Please try again." })
    } finally {
      if (requestAccountId === selectedAccountIdRef.current) setIsRefreshing(false)
    }
  }

  async function handleRefreshFromError(isRetry: boolean) {
    if (!selectedAccountId) return
    const requestAccountId = selectedAccountId

    const currentCount = refreshRetryCountRef.current.get(requestAccountId) ?? 0
    refreshRetryCountRef.current.set(requestAccountId, isRetry ? currentCount + 1 : 0)

    setIsRefreshing(true)
    try {
      await chatApi.refreshChatHistory(requestAccountId, api.CURRENT_USER)
      if (requestAccountId !== selectedAccountIdRef.current) return

      chatIds.set(requestAccountId, crypto.randomUUID())
      sessionIds.set(requestAccountId, generateSessionId())
      messageCache.delete(requestAccountId)
      pendingRequests.delete(requestAccountId)
      pendingMessages.delete(requestAccountId)
      notify()
      setMessages([makeGreeting()])
      setExpandedSources(new Set())
      setShowPrompts(true)
    } catch {
      if (requestAccountId !== selectedAccountIdRef.current) return
      const retryCount = refreshRetryCountRef.current.get(requestAccountId) ?? 0
      if (retryCount >= MAX_REFRESH_RETRIES) {
        setMessages([
          {
            id: "refresh-final-error",
            text: "Chat is temporarily unavailable. Please try again later.",
            isUser: false,
            timestamp: new Date(),
            error: true,
          },
        ])
      } else {
        setMessages([
          {
            id: "refresh-error",
            text: `Failed to start new chat. (${retryCount}/${MAX_REFRESH_RETRIES})`,
            isUser: false,
            timestamp: new Date(),
            error: true,
            action: "retry-refresh",
          },
        ])
      }
    } finally {
      if (requestAccountId === selectedAccountIdRef.current) setIsRefreshing(false)
    }
  }

  // Bookmark icon on a user message bubble. Removing an already-saved
  // prompt is instant (nothing to edit); saving a new one opens a small
  // dialog to name it first — see SavePromptDialog.
  async function handleBookmarkClick(text: string) {
    const existing = savedPrompts.find((p) => p.prompt_text === text)
    if (existing) {
      try {
        await api.deleteSavedPrompt(existing.id, api.CURRENT_USER)
        toast.success("Removed from Saved Prompts")
        await revalidatePrompts()
      } catch (err) {
        toast.error("Couldn't remove prompt", { description: err instanceof Error ? err.message : undefined })
      }
      return
    }
    setSaveDialogText(text)
  }

  // Picking a prompt from the library only fills the input — it's the
  // user's call whether to edit it before sending. (Quick-prompt chips are
  // the one exception that still sends immediately.)
  function insertPrompt(text: string) {
    setInputValue(text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI assistant"
        className="fixed right-6 bottom-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl"
        style={{ opacity: isOpen ? 0 : 1, transform: isOpen ? "scale(0)" : "scale(1)" }}
      >
        <MessageSquare className="size-6" aria-hidden="true" />
      </button>

      {/* Overlay (expanded mode only) */}
      <div
        onClick={() => setIsExpanded(false)}
        className={`fixed inset-0 z-45 bg-black/30 transition-opacity duration-300 ${
          isOpen && isExpanded ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Chat Panel */}
      <div
        className={`fixed right-0 bottom-0 z-50 flex flex-col rounded-t-2xl border bg-card shadow-2xl transition-all duration-300 ${
          isOpen
            ? isExpanded
              ? "h-[calc(100vh-56px)] w-[calc(100vw-240px)] translate-y-0 opacity-100"
              : "h-[min(600px,calc(100vh-56px))] w-[420px] translate-y-0 opacity-100"
            : "h-0 w-0 translate-y-4 overflow-hidden opacity-0"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
              <MessageSquare className="size-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              disabled={messages.length <= 1 || isRefreshing || isLoading || isHistoryLoading}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              title="New chat"
              aria-label="New chat"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isExpanded ? "Minimize" : "Maximize"}
              aria-label={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {messages.map((message) => {
              const isSourceExpanded = expandedSources.has(message.id)
              const sourcesToShow = isSourceExpanded ? message.sources : message.sources?.slice(0, 3)
              const hasMore = (message.sources?.length ?? 0) > 3
              const hasSources = !message.isUser && message.sources && message.sources.length > 0
              const isSaved = message.isUser && savedPrompts.some((p) => p.prompt_text === message.text)

              return (
                <Fragment key={message.id}>
                  <div className={`group flex items-start gap-1.5 ${message.isUser ? "justify-end" : "justify-start"}`}>
                    {!message.isUser && (
                      <div className="mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                        <Bot className="size-4 text-primary-foreground" aria-hidden="true" />
                      </div>
                    )}
                    {message.isUser && (
                      <button
                        onClick={() => void handleBookmarkClick(message.text)}
                        title={isSaved ? "Remove from Saved Prompts" : "Save question as prompt"}
                        aria-label={isSaved ? "Remove from Saved Prompts" : "Save question as prompt"}
                        className={`mt-1.5 shrink-0 rounded-md p-1 transition-colors hover:bg-muted ${
                          isSaved ? "text-primary" : "text-muted-foreground/50 hover:text-primary"
                        }`}
                      >
                        {isSaved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                      </button>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.isUser
                          ? "rounded-br-md bg-primary text-primary-foreground shadow-sm"
                          : message.error
                            ? "rounded-bl-md border border-destructive/30 bg-destructive/5 text-destructive"
                            : "rounded-bl-md border bg-card shadow-sm"
                      }`}
                    >
                      {message.isUser ? (
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      ) : (
                        <ChatMarkdown content={message.text} sources={message.sources} />
                      )}
                    </div>
                  </div>

                  {message.action && (
                    <div className="mt-1 ml-10">
                      <button
                        onClick={() => void handleRefreshFromError(message.action === "retry-refresh")}
                        disabled={isRefreshing}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRefreshing ? "Starting..." : message.action === "retry-refresh" ? "Retry" : "Start new chat"}
                      </button>
                    </div>
                  )}

                  {hasSources && (
                    <div className="ml-10">
                      <div className="rounded-xl border bg-muted/40">
                        <div className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              Sources
                              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{message.sources?.length}</span>
                            </p>
                            {hasMore && (
                              <button
                                onClick={() => toggleSourceExpansion(message.id)}
                                className="text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
                              >
                                {isSourceExpanded ? "Show less" : `Show all ${message.sources?.length}`}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {sourcesToShow?.map((source) => (
                              <div key={source.index} className="flex items-start gap-2 text-xs">
                                <span className="flex size-4 shrink-0 items-center justify-center rounded bg-accent text-[10px] font-bold text-accent-foreground">
                                  {source.index}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={source.citations[0]?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary hover:underline"
                                  >
                                    <span className="truncate">{source.title}</span>
                                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                                  </a>
                                  <p className="mt-0.5 text-muted-foreground/70">{source.citations[0]?.source}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {!isSourceExpanded && hasMore && (
                          <div className="border-t bg-muted/60 px-3 py-2">
                            <p className="text-center text-[10px] text-muted-foreground">
                              +{(message.sources?.length ?? 0) - 3} more sources
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })}

            {/* History loading indicator */}
            {isHistoryLoading && messages.length <= 1 && (
              <div className="flex justify-start">
                <div className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Bot className="size-5 text-accent-foreground" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Loading conversation...</span>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Bot className="size-5 text-accent-foreground" aria-hidden="true" />
                </div>
                <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-3">
                  <div className="flex gap-1">
                    <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <div className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <div className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* Predefined prompt chips */}
            {showPrompts && !isLoading && (quickPromptsLoading || (quickPrompts?.length ?? 0) > 0) && (
              <div className="flex flex-col items-start gap-3 pl-10">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Try asking</span>
                </div>
                {quickPromptsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Loading prompts...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {quickPrompts?.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => void handleSend(prompt.prompt_text)}
                        title={prompt.prompt_text}
                        className="group flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/50 hover:bg-accent hover:shadow-md active:scale-[0.98]"
                      >
                        <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" aria-hidden="true" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs leading-snug font-semibold transition-colors group-hover:text-accent-foreground">{prompt.name}</span>
                          <span className="line-clamp-1 text-[11px] leading-snug text-muted-foreground">{prompt.prompt_text}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-muted/40 p-4">
          <div
            role="radiogroup"
            aria-label="Data source"
            className="mb-2 flex h-8 items-center gap-0.5 self-start rounded-lg bg-muted p-0.5"
          >
            {DATA_SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                role="radio"
                aria-checked={dataSource === source}
                onClick={() => setDataSource(source)}
                className={`h-full rounded-md px-3 text-xs font-medium capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  dataSource === source ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {source}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-md focus-within:ring-3 focus-within:ring-primary/10">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              title="Prompt library"
              aria-label="Open prompt library"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-all hover:bg-accent/70 hover:shadow-sm"
            >
              <Library className="size-5" aria-hidden="true" />
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this account..."
              rows={1}
              className="min-h-11 max-h-20 flex-1 resize-none rounded-xl bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={() => void handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading || isRefreshing || isHistoryLoading}
              aria-label="Send message"
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                inputValue.trim() ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-95" : "bg-muted text-muted-foreground"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Send className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">AI can make mistakes. Verify important information.</p>
        </div>
      </div>

      <PromptLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} onSelectPrompt={insertPrompt} />
      <SavePromptDialog
        open={saveDialogText !== null}
        onOpenChange={(next) => {
          if (!next) setSaveDialogText(null)
        }}
        initialText={saveDialogText ?? ""}
      />
    </>
  )
}
