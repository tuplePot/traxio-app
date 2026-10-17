import { Check, Monitor, Moon, Sun } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { COLOR_MODES, THEMES, useTheme } from "@/lib/theme-context"
import type { ColorMode } from "@/lib/theme-context"

const MODE_ICONS: Record<ColorMode, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

function optionClass(selected: boolean) {
  return cn(
    "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
    selected
      ? "border-primary bg-primary/10"
      : "border-border hover:border-foreground/30 hover:bg-muted/40"
  )
}

function SelectedMark() {
  return (
    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary sm:top-3 sm:right-3">
      <Check className="size-3 text-primary-foreground" />
    </span>
  )
}

export default function ThemesContent() {
  const { theme, setTheme, mode, setMode } = useTheme()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mode Tampilan</CardTitle>
          <CardDescription>
            Pilih tampilan gelap, terang, atau ikuti pengaturan perangkat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {COLOR_MODES.map((m) => {
              const Icon = MODE_ICONS[m.id]
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={optionClass(mode === m.id)}
                >
                  {mode === m.id && <SelectedMark />}
                  <Icon className="size-6" />
                  <span className="text-sm font-semibold">{m.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tema Warna</CardTitle>
          <CardDescription>
            Pilih warna aksen untuk tombol, grafik, dan ambient background di
            seluruh aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={optionClass(theme === t.id)}
              >
                {theme === t.id && <SelectedMark />}
                <span
                  className="size-8 rounded-full"
                  style={{ backgroundColor: t.swatch }}
                />
                <span className="text-sm font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
