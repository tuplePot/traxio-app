import { useMemo, useState } from "react"
import { BookOpen } from "lucide-react"
import { TextInput } from "@/components/inputs/TextInput"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { CATEGORY_LABEL, GLOSSARY_TERMS } from "./terms"
import { GlossaryTermCard } from "./GlossaryTermCard"
import type { ActiveCategory, GlossaryCategory } from "./types"

const CATEGORIES = Object.keys(CATEGORY_LABEL) as GlossaryCategory[]

export function GlossaryContent() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ActiveCategory>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GLOSSARY_TERMS.filter((t) => {
      if (category !== "all" && t.category !== category) return false
      if (!q) return true
      return [t.term, t.fullName, t.summary].some((s) => s?.toLowerCase().includes(q))
    })
  }, [query, category])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <TextInput
          type="search"
          placeholder="Cari istilah, misalnya RSI, MACD, stop-loss..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={category === "all" ? "default" : "outline"}
            onClick={() => setCategory("all")}
          >
            Semua
          </Button>
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABEL[c]}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="Istilah tidak ditemukan"
          description={`Tidak ada istilah yang cocok dengan "${query}".`}
        />
      ) : (
        CATEGORIES.map((c) => {
          const terms = filtered.filter((t) => t.category === c)
          if (terms.length === 0) return null
          return (
            <section key={c} className="flex flex-col gap-3">
              <Typography
                size="xs"
                weight="semibold"
                color="muted"
                className="tracking-widest uppercase"
              >
                {CATEGORY_LABEL[c]}
              </Typography>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {terms.map((t) => (
                  <GlossaryTermCard key={t.id} term={t} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
