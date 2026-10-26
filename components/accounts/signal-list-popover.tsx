"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { signalText, signalTypeLabel } from "@/lib/use-signals-data"
import type { AccountSignal } from "@/lib/types"

export interface PopoverAnchor {
  top: number
  bottom: number
  left: number
  right: number
}

// Topbar is h-14 (56px). The popover must never slide under it (it renders at
// z-90, below the topbar's z-100) and must clear the vertical scrollbar.
const TOPBAR_H = 56
const MIN_TOP = TOPBAR_H + 8

function computePos(anchor: PopoverAnchor) {
  const width = 280
  // clientWidth excludes the vertical scrollbar, so the panel can't overlap it.
  const viewportW = document.documentElement.clientWidth || window.innerWidth
  // Left edge lines up with the invoking cell (clamped to stay on screen).
  const left = Math.max(8, Math.min(anchor.left, viewportW - width - 8))
  // Always directly below the cell - never flips above it.
  const styleTop = Math.max(anchor.bottom + 8, MIN_TOP)
  // Shrink to the space available below the cell; 120px floor keeps it usable.
  const maxHeight = Math.max(120, Math.min(window.innerHeight * 0.55, window.innerHeight - styleTop - 8))
  return { width, left, maxHeight, styleTop }
}

interface SignalListPopoverProps {
  accountName: string
  signalType: string
  items: AccountSignal[]
  anchorEl: HTMLElement | null
  anchor: PopoverAnchor
  onClose: () => void
}

export function SignalListPopover({ accountName, signalType, items, anchorEl, anchor, onClose }: SignalListPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [pos, setPos] = useState(() => computePos(anchor))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const requestClose = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => onCloseRef.current(), 150)
  }
  const closeRef = useRef(requestClose)
  closeRef.current = requestClose

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Keep the popover glued to the invoking cell during any scroll/resize.
  useEffect(() => {
    const update = () => {
      const r = anchorEl?.getBoundingClientRect() ?? anchor
      // Anchor scrolled out of view (under the topbar / off-screen): dismiss
      // instead of leaving an orphaned floating panel.
      if (r.bottom < MIN_TOP || r.top > window.innerHeight - 8 || r.right < 0 || r.left > window.innerWidth) {
        closeRef.current()
        return
      }
      setPos(computePos({ top: r.top, bottom: r.bottom, left: r.left, right: r.right }))
    }
    update()
    document.addEventListener("scroll", update, { capture: true })
    window.addEventListener("resize", update)
    return () => {
      document.removeEventListener("scroll", update, { capture: true })
      window.removeEventListener("resize", update)
    }
  }, [anchorEl, anchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) requestClose()
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  if (typeof document === "undefined") return null

  const shown = visible && !leaving

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${signalTypeLabel(signalType)} signals for ${accountName}`}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.styleTop,
        width: pos.width,
        maxHeight: pos.maxHeight,
        zIndex: 90,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0) scale(1)" : "translateY(4px) scale(0.98)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
      className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="min-w-0 truncate text-xs font-semibold text-foreground">{signalTypeLabel(signalType)}</h2>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close signals panel"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border bg-card">
            <div className="px-3 py-2">
              {signalText(item) ? (
                <p className="text-xs leading-snug text-foreground/80">{signalText(item)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No description.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  )
}
