import { useEffect, useRef, useState } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { searchSymbols } from "@/server/symbol-search"
import type { TVSymbol } from "@/server/symbol-search"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TypeBadge } from "../TypeBadge"

interface SymbolSearchDropdownProps {
  onSelect: (s: TVSymbol) => void
  onClose: () => void
}

export function SymbolSearchDropdown({
  onSelect,
  onClose,
}: SymbolSearchDropdownProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TVSymbol[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchSymbols({ data: { query: query.trim() } }))
        setFocused(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose()
      return
    }
    if (e.key === "ArrowDown") {
      setFocused((f) => Math.min(f + 1, results.length - 1))
      e.preventDefault()
    }
    if (e.key === "ArrowUp") {
      setFocused((f) => Math.max(f - 1, -1))
      e.preventDefault()
    }
    if (e.key === "Enter" && focused >= 0 && results[focused])
      onSelect(results[focused])
  }

  return (
    <div className="absolute top-full left-0 z-50 mt-1.5 w-full sm:w-[420px] sm:max-w-[95vw]">
      <Card className="overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari simbol... (BRMS, BTC, AAPL)"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto">
            {results.map((sym, i) => (
              <button
                key={sym.fullName}
                onClick={() => onSelect(sym)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  i === focused ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {sym.symbol}
                    </span>
                    <TypeBadge type={sym.type} />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {sym.description}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] tracking-widest text-muted-foreground">
                  {sym.exchange}
                </span>
              </button>
            ))}
          </div>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Tidak ada hasil untuk "{query}"
            </p>
          </div>
        )}
        {!query.trim() && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Ketik nama atau ticker simbol
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
