"use client"

import { Component, type ReactNode } from "react"
import type { ChatSource } from "@/lib/types"
import "./chat-markdown.css"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="chat-md-error">
            Unable to render formatting. Raw text:
            <pre className="mt-1 text-[11px] whitespace-pre-wrap">{String(this.state.error?.message ?? "Unknown error")}</pre>
          </div>
        )
      )
    }
    return this.props.children
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "")
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[\u{20E3}]/gu, "")
    .replace(/[\u{E0020}-\u{E007F}]/gu, "")
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim()
}

function parseInline(text: string, sources?: ChatSource[]): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  const lines = text.split("\n")
  const pattern =
    /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`([^`]+)`|\[(\d+)\]|\[([^\]]+)\]\(([^)]+)\))/g

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) tokens.push(<br key={`br${lineIndex}`} />)

    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<span key={`t${lineIndex}-${lastIndex}`}>{line.slice(lastIndex, match.index)}</span>)
      }

      if (match[2]) {
        tokens.push(
          <strong key={`s${lineIndex}-${match.index}`} className="font-semibold">
            <em>{match[2]}</em>
          </strong>,
        )
      } else if (match[3]) {
        tokens.push(
          <strong key={`s${lineIndex}-${match.index}`} className="font-semibold">
            {match[3]}
          </strong>,
        )
      } else if (match[4]) {
        tokens.push(
          <em key={`e${lineIndex}-${match.index}`} className="italic">
            {match[4]}
          </em>,
        )
      } else if (match[5]) {
        tokens.push(
          <strong key={`s${lineIndex}-${match.index}`} className="font-semibold">
            {match[5]}
          </strong>,
        )
      } else if (match[6]) {
        tokens.push(
          <em key={`e${lineIndex}-${match.index}`} className="italic">
            {match[6]}
          </em>,
        )
      } else if (match[7]) {
        tokens.push(
          <code key={`c${lineIndex}-${match.index}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-pink-600">
            {match[7]}
          </code>,
        )
      } else if (match[8]) {
        const citationIndex = parseInt(match[8], 10)
        tokens.push(
          <sup
            key={`ref${lineIndex}-${match.index}`}
            className="inline-flex size-4 cursor-pointer items-center justify-center rounded bg-accent text-[10px] font-bold text-accent-foreground transition-colors hover:bg-accent/70"
            title={sources?.find((s) => s.index === citationIndex)?.title || `Source ${citationIndex}`}
          >
            {citationIndex}
          </sup>,
        )
      } else if (match[9] && match[10]) {
        tokens.push(
          <a
            key={`a${lineIndex}-${match.index}`}
            href={match[10]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-primary/20 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {match[9]}
          </a>,
        )
      }

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < line.length) tokens.push(<span key={`t${lineIndex}-${lastIndex}`}>{line.slice(lastIndex)}</span>)
  })

  return tokens.length > 0 ? tokens : [text]
}

interface ParsedBlock {
  type: "heading" | "paragraph" | "code" | "ul" | "ol" | "blockquote" | "hr" | "table"
  level?: number
  content: string
  items?: string[]
  rows?: string[][]
}

interface NestedItem {
  content: string
  children: NestedItem[]
}

const RE = {
  hr: /^(\*{3,}|-{3,}|_{3,})\s*$/,
  heading: /^(#{1,6})\s+(.*)$/,
  codeFence: /^```/,
  blockquote: /^>\s?(.*)$/,
  orderedItem: /^(\s*)(\d+\.)\s+(.*)$/,
  unorderedItem: /^(\s*)([-*+])\s+(.*)/,
  tableSeparator: /^\|?[\s\-:|]+\|?$/,
  headingInline: /^(.*?)\s*(#{1,6}\s+.+)$/,
}

function getIndentLen(s: string): number {
  const m = s.match(/^(\s*)/)
  return m ? m[1].length : 0
}

function isListItem(s: string): boolean {
  return RE.orderedItem.test(s) || RE.unorderedItem.test(s)
}

function parseBlocks(markdown: string): ParsedBlock[] {
  const lines = markdown.split("\n")
  const blocks: ParsedBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === "") {
      i++
      continue
    }

    if (RE.hr.test(line)) {
      blocks.push({ type: "hr", content: "" })
      i++
      continue
    }

    const headingMatch = line.match(RE.heading)
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, content: headingMatch[2] })
      i++
      continue
    }

    if (RE.codeFence.test(line)) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !RE.codeFence.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: "code", content: codeLines.join("\n") })
      if (i < lines.length) i++
      continue
    }

    const bqMatch = line.match(RE.blockquote)
    if (bqMatch) {
      const bqLines: string[] = [bqMatch[1]]
      i++
      while (i < lines.length && RE.blockquote.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      blocks.push({ type: "blockquote", content: bqLines.join("\n") })
      continue
    }

    if (line.includes("|") && i + 1 < lines.length && RE.tableSeparator.test(lines[i + 1])) {
      const parseRow = (row: string) => row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
      const headerRow = parseRow(line)
      i += 2
      const bodyRows: string[][] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        bodyRows.push(parseRow(lines[i]))
        i++
      }
      blocks.push({ type: "table", content: "", rows: [headerRow, ...bodyRows] })
      continue
    }

    if (isListItem(line)) {
      const baseIndent = getIndentLen(line)
      const isOl = RE.orderedItem.test(line)
      const items: string[] = []
      let currentItemContent = ""

      const pushCurrentItem = () => {
        if (currentItemContent.trim()) {
          items.push(currentItemContent.trim())
          currentItemContent = ""
        }
      }

      while (i < lines.length) {
        const cur = lines[i]

        if (cur.trim() === "") {
          i++
          continue
        }

        if (RE.heading.test(cur)) {
          pushCurrentItem()
          break
        }
        if (RE.codeFence.test(cur)) {
          pushCurrentItem()
          break
        }
        if (RE.blockquote.test(cur)) {
          pushCurrentItem()
          break
        }

        if (isListItem(cur)) {
          const curIndent = getIndentLen(cur)
          if (curIndent < baseIndent) {
            pushCurrentItem()
            break
          }
          if (curIndent > baseIndent) {
            currentItemContent += "\n" + cur
            i++
            continue
          }
          pushCurrentItem()
          const itemMatch = cur.match(RE.orderedItem) || cur.match(RE.unorderedItem)
          if (itemMatch) currentItemContent = itemMatch[3] ?? itemMatch[itemMatch.length - 1]
          i++
          continue
        }

        if (getIndentLen(cur) >= baseIndent + 2) {
          const trimmed = cur.trim()
          const needsNewline = /^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)
          currentItemContent += needsNewline ? "\n" + trimmed : " " + trimmed
          i++
          continue
        }
        break
      }

      pushCurrentItem()

      if (items.length > 0) blocks.push({ type: isOl ? "ol" : "ul", content: "", items })
      continue
    }

    const headingInline = line.match(RE.headingInline)
    if (headingInline) {
      if (headingInline[1].trim()) blocks.push({ type: "paragraph", content: headingInline[1].trim() })
      blocks.push({
        type: "heading",
        level: headingInline[2].match(/^(#{1,6})/)?.[1].length ?? 1,
        content: headingInline[2].replace(/^#{1,6}\s+/, ""),
      })
      i++
      continue
    }

    const paraLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !RE.heading.test(lines[i]) &&
      !RE.codeFence.test(lines[i]) &&
      !RE.blockquote.test(lines[i]) &&
      !isListItem(lines[i]) &&
      !RE.hr.test(lines[i])
    ) {
      const hi = lines[i].match(RE.headingInline)
      if (hi) {
        if (hi[1].trim()) paraLines.push(hi[1].trim())
        break
      }
      paraLines.push(lines[i])
      i++
    }
    blocks.push({ type: "paragraph", content: paraLines.join("\n") })
  }

  return blocks
}

function splitListItemContent(itemContent: string): { mainContent: string; nestedItems: NestedItem[] } {
  const lines = itemContent.split("\n")
  const mainLines: string[] = []
  const nestedItems: NestedItem[] = []

  let minListIndent = Infinity
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const indent = line.length - line.trimStart().length
      minListIndent = Math.min(minListIndent, indent)
    }
  }

  if (minListIndent === Infinity) return { mainContent: lines.join("\n"), nestedItems: [] }

  const stack: { indent: number; item: NestedItem }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const indent = line.length - line.trimStart().length

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "")
      const relIndent = indent - minListIndent
      const newItem: NestedItem = { content, children: [] }

      while (stack.length > 0 && stack[stack.length - 1].indent >= relIndent) stack.pop()

      if (stack.length === 0) nestedItems.push(newItem)
      else stack[stack.length - 1].item.children.push(newItem)

      stack.push({ indent: relIndent, item: newItem })
    } else if (trimmed !== "") {
      if (stack.length > 0) stack[stack.length - 1].item.content += " " + trimmed
      else mainLines.push(line)
    }
  }

  return { mainContent: mainLines.join("\n"), nestedItems }
}

function renderNestedList(items: NestedItem[], inline: (text: string) => React.ReactNode): React.ReactNode {
  return (
    <ul>
      {items.map((item, idx) => (
        <li key={idx}>
          {inline(item.content)}
          {item.children.length > 0 && renderNestedList(item.children, inline)}
        </li>
      ))}
    </ul>
  )
}

function renderBlock(block: ParsedBlock, key: string | number, sources?: ChatSource[]): React.ReactNode {
  const inline = (text: string) => parseInline(text, sources)
  switch (block.type) {
    case "heading": {
      const content = inline(block.content)
      const cls = `chat-markdown h${block.level}`
      switch (block.level) {
        case 1:
          return <h1 key={key} className={cls}>{content}</h1>
        case 2:
          return <h2 key={key} className={cls}>{content}</h2>
        case 3:
          return <h3 key={key} className={cls}>{content}</h3>
        case 4:
          return <h4 key={key} className={cls}>{content}</h4>
        case 5:
          return <h5 key={key} className={cls}>{content}</h5>
        default:
          return <h6 key={key} className={cls}>{content}</h6>
      }
    }
    case "paragraph":
      return (
        <p key={key} className="chat-markdown">
          {inline(block.content)}
        </p>
      )
    case "code":
      return (
        <pre key={key} className="chat-markdown">
          <code>{block.content}</code>
        </pre>
      )
    case "ul":
      return (
        <ul key={key} className="chat-markdown">
          {block.items?.map((item, idx) => {
            const { mainContent, nestedItems } = splitListItemContent(item)
            return (
              <li key={idx}>
                {inline(mainContent)}
                {nestedItems.length > 0 && renderNestedList(nestedItems, inline)}
              </li>
            )
          })}
        </ul>
      )
    case "ol":
      return (
        <ol key={key} className="chat-markdown">
          {block.items?.map((item, idx) => {
            const { mainContent, nestedItems } = splitListItemContent(item)
            return (
              <li key={idx}>
                {inline(mainContent)}
                {nestedItems.length > 0 && renderNestedList(nestedItems, inline)}
              </li>
            )
          })}
        </ol>
      )
    case "blockquote":
      return (
        <blockquote key={key} className="chat-markdown">
          {inline(block.content)}
        </blockquote>
      )
    case "hr":
      return <hr key={key} className="chat-markdown" />
    case "table": {
      const [header, ...body] = block.rows ?? []
      return (
        <div key={key} className="my-2 overflow-x-auto">
          <table className="chat-markdown min-w-full">
            <thead>
              <tr>{header?.map((cell, ci) => <th key={ci}>{inline(cell)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    default:
      return null
  }
}

interface ChatMarkdownProps {
  content: string
  className?: string
  sources?: ChatSource[]
}

export function ChatMarkdown({ content, className = "", sources }: ChatMarkdownProps) {
  const safeContent = stripEmoji(content ?? "")

  let blocks: ParsedBlock[]
  try {
    blocks = parseBlocks(safeContent)
  } catch {
    return (
      <div className={`chat-markdown ${className}`}>
        <div className="chat-md-error">Failed to parse markdown. Showing raw text.</div>
        <p className="mt-1 text-sm">{escapeHtml(safeContent)}</p>
      </div>
    )
  }

  return (
    <MarkdownErrorBoundary
      fallback={
        <div className={`chat-markdown ${className}`}>
          <div className="chat-md-error">Formatting error. Showing raw text.</div>
          <p className="mt-1 text-sm">{escapeHtml(safeContent)}</p>
        </div>
      }
    >
      <div className={`chat-markdown ${className}`}>{blocks.map((block, idx) => renderBlock(block, idx, sources))}</div>
    </MarkdownErrorBoundary>
  )
}
