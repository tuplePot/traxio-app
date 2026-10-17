import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { NEWS_SOURCES } from "./constants"
import type { NewsSourceId } from "./constants"

interface NewsSourceChooseProps {
  value: NewsSourceId
  onValueChange: (value: NewsSourceId) => void
}

export default function NewsSourceChoose({
  value,
  onValueChange,
}: NewsSourceChooseProps) {
  const selected = NEWS_SOURCES.find((s) => s.value === value) ?? null

  return (
    <Combobox
      items={NEWS_SOURCES}
      value={selected}
      onValueChange={(item) => item && onValueChange(item.value)}
    >
      <ComboboxInput placeholder="Pilih sumber berita..." className="w-44" />
      <ComboboxContent>
        <ComboboxEmpty>Sumber tidak ditemukan.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
