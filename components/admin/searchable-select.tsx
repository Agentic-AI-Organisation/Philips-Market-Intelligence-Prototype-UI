"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface SearchableOption {
  value: string
  label: string
  hint?: string
  keywords?: string[]
}

interface SearchableSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
  className?: string
  invalid?: boolean
  "aria-label"?: string
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
  invalid,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-destructive",
          className,
        )}
      >
        <span className={cn("flex min-w-0 items-baseline gap-2 truncate", !selected && "text-muted-foreground")}>
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {selected?.hint && (
            <span className="shrink-0 text-xs text-muted-foreground">{selected.hint}</span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.label}</span>
                  {option.hint && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{option.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
