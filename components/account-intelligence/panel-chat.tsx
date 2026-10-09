"use client"

import { useState, useRef, useEffect, useCallback, Fragment } from "react"
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
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import * as api from "@/lib/mock-api"
import type { ChatSource } from "@/lib/types"
import { useAccountContext } from "@/lib/account-context"
import { useQuickPrompts, useRevalidatePrompts, useSavedPrompts, useSystemPrompts } from "@/lib/use-prompts-data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatMarkdown } from "./chat-markdown"

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  sources?: ChatSource[]
  error?: boolean
}

const GREETING: ChatMessage = {
  id: "greeting",
  text: "Hello! I'm your AI research assistant. Ask me anything about the selected account.",
  isUser: false,
  timestamp: new Date(),
}

// Trimmed from itaap-commercialit-account-intelligence-ui's PanelChat — the
// real one carries substantial per-account session/race-guard plumbing
// (chat-id maps, pending-request tracking, local message caching) needed
// because it talks to a live, slow backend. None of that applies to a
// single-threaded mock, so this keeps only the visual/interaction states:
// empty state with quick prompts, typing indicator, markdown+sources
// rendering, and an error bubble with retry.
export function PanelChat() {
  const { selectedAccountId } = useAccountContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [showPrompts, setShowPrompts] = useState(true)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [newSavedPromptText, setNewSavedPromptText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: quickPrompts, isLoading: quickPromptsLoading } = useQuickPrompts()
  const { systemPrompts } = useSystemPrompts()
  const { savedPrompts } = useSavedPrompts(api.CURRENT_USER)
  const revalidatePrompts = useRevalidatePrompts()

  // Switching accounts starts a fresh conversation — the real app hydrates
  // prior history from chat-history here instead; skipped for the mock.
  useEffect(() => {
    if (!selectedAccountId) return
    setMessages([GREETING])
    setExpandedSources(new Set())
    setShowPrompts(true)
    setIsLoading(false)
    setInputValue("")
  }, [selectedAccountId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

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
    const accountId = selectedAccountId
    setLibraryOpen(false)

    const userMessage: ChatMessage = { id: Date.now().toString(), text: text.trim(), isUser: true, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setShowPrompts(false)

    try {
      const data = await api.sendChatQuery(accountId, text.trim())
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        isUser: false,
        timestamp: new Date(),
        sources: data.sources,
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "Failed to get response. Please try again.",
        isUser: false,
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  function handleReset() {
    if (isLoading) return
    setMessages([GREETING])
    setExpandedSources(new Set())
    setShowPrompts(true)
  }

  // Toggle-save: a prompt already in "My Prompts" un-saves on click, same
  // bookmark-icon convention as most apps. Triggered from the hover icon on
  // a user message bubble — saving is about a prompt the user already sent
  // and liked the answer to, not something picked before typing.
  async function toggleSavedPrompt(text: string) {
    const existing = savedPrompts.find((p) => p.prompt_text === text)
    try {
      if (existing) {
        await api.deleteSavedPrompt(existing.id, api.CURRENT_USER)
        toast.success("Removed from My Prompts")
      } else {
        await api.saveSavedPrompt(api.CURRENT_USER, text)
        toast.success("Saved to My Prompts")
      }
      await revalidatePrompts()
    } catch (err) {
      toast.error("Couldn't update My Prompts", { description: err instanceof Error ? err.message : undefined })
    }
  }

  async function handleAddSavedPrompt() {
    const text = newSavedPromptText.trim()
    if (!text) return
    try {
      await api.saveSavedPrompt(api.CURRENT_USER, text)
      setNewSavedPromptText("")
      await revalidatePrompts()
    } catch (err) {
      toast.error("Couldn't save prompt", { description: err instanceof Error ? err.message : undefined })
    }
  }

  async function handleDeleteSavedPrompt(id: number) {
    try {
      await api.deleteSavedPrompt(id, api.CURRENT_USER)
      await revalidatePrompts()
    } catch (err) {
      toast.error("Couldn't remove prompt", { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl"
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
            : "h-0 w-0 translate-y-4 opacity-0"
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
              disabled={messages.length <= 1 || isLoading}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              title="New chat"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                        onClick={() => toggleSavedPrompt(message.text)}
                        title={isSaved ? "Remove from My Prompts" : "Save to My Prompts"}
                        className={`mt-1.5 shrink-0 rounded-md p-1 transition-opacity ${
                          isSaved ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary"
                        }`}
                      >
                        {isSaved ? <BookmarkCheck className="size-3.5" aria-hidden="true" /> : <Bookmark className="size-3.5" aria-hidden="true" />}
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

                  {message.error && (
                    <div className="mt-1 ml-10">
                      <button
                        onClick={handleReset}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                      >
                        Start new chat
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
                                className="text-[10px] font-medium text-primary hover:opacity-80"
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
                        onClick={() => handleSend(prompt.prompt_text)}
                        title={prompt.prompt_text}
                        className="group flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/50 hover:bg-accent hover:shadow-md active:scale-[0.98]"
                      >
                        <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" aria-hidden="true" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs leading-snug font-semibold">{prompt.name}</span>
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
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-md focus-within:ring-3 focus-within:ring-primary/10">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this account..."
              rows={1}
              className="min-h-11 max-h-25 flex-1 resize-none rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "auto"
                target.style.height = Math.min(target.scrollHeight, 100) + "px"
              }}
            />

            <Popover open={libraryOpen} onOpenChange={setLibraryOpen}>
              <PopoverTrigger
                title="Browse prompts"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Library className="size-5" aria-hidden="true" />
              </PopoverTrigger>
              <PopoverContent align="end" side="top" className="w-80 p-0">
                <Tabs defaultValue="system" className="gap-0">
                  <TabsList className="m-2 mb-0">
                    <TabsTrigger value="system">System prompts</TabsTrigger>
                    <TabsTrigger value="mine">My prompts</TabsTrigger>
                  </TabsList>

                  <TabsContent value="system" className="max-h-72 overflow-y-auto p-2">
                    {systemPrompts.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-muted-foreground">No system prompts yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {systemPrompts.map((prompt) => (
                          <button
                            key={prompt.id}
                            onClick={() => handleSend(prompt.prompt_text)}
                            className="flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                          >
                            <span className="text-xs font-semibold">{prompt.name}</span>
                            <span className="line-clamp-2 text-[11px] text-muted-foreground">{prompt.prompt_text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="mine" className="flex max-h-72 flex-col gap-2 overflow-y-auto p-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={newSavedPromptText}
                        onChange={(e) => setNewSavedPromptText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddSavedPrompt()
                          }
                        }}
                        placeholder="Add a prompt to save…"
                        className="h-8 flex-1 rounded-lg border bg-card px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none"
                      />
                      <button
                        onClick={handleAddSavedPrompt}
                        disabled={!newSavedPromptText.trim()}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                        aria-label="Add prompt"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    {savedPrompts.length === 0 ? (
                      <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                        Nothing saved yet — bookmark a prompt from the conversation, or add one above.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {savedPrompts.map((prompt) => (
                          <div key={prompt.id} className="group/item flex items-start gap-1 rounded-lg px-2.5 py-2 hover:bg-muted">
                            <button onClick={() => handleSend(prompt.prompt_text)} className="min-w-0 flex-1 text-left">
                              <span className="line-clamp-2 text-xs">{prompt.prompt_text}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSavedPrompt(prompt.id)}
                              aria-label="Remove saved prompt"
                              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>

            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
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
    </>
  )
}
