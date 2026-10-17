import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

export type ThemeId = "emerald" | "purple" | "rose"
export type ColorMode = "dark" | "light" | "system"
export type ResolvedMode = "dark" | "light"

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "emerald", label: "Emerald", swatch: "oklch(0.72 0.19 162)" },
  { id: "purple", label: "Purple", swatch: "oklch(0.68 0.22 300)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.68 0.21 18)" },
]

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "dark", label: "Gelap" },
  { id: "light", label: "Terang" },
  { id: "system", label: "Sistem" },
]

const STORAGE_KEY = "traxio-theme"
const MODE_STORAGE_KEY = "traxio-mode"
const DEFAULT_THEME: ThemeId = "emerald"
const DEFAULT_MODE: ColorMode = "dark"

// Applies the persisted accent theme + color mode before first paint to avoid
// a flash of the wrong theme on reload. Must mirror applyTheme/applyMode below.
export const THEME_INIT_SCRIPT = `
  try {
    var d = document.documentElement;
    var t = localStorage.getItem("${STORAGE_KEY}");
    if (t && t !== "${DEFAULT_THEME}") d.setAttribute("data-theme", t);
    var m = localStorage.getItem("${MODE_STORAGE_KEY}") || "${DEFAULT_MODE}";
    if (m === "system") m = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    d.classList.toggle("dark", m !== "light");
  } catch (e) {}
`

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  mode: ColorMode
  resolvedMode: ResolvedMode
  setMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}

function applyTheme(theme: ThemeId) {
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme")
  } else {
    document.documentElement.setAttribute("data-theme", theme)
  }
}

function systemMode(): ResolvedMode {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark"
}

function applyMode(resolved: ResolvedMode) {
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_MODE)
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>("dark")
  // Mode is unknown until localStorage is read; applying the default before
  // that would flip the class the init script already set (visible flash).
  const [hydrated, setHydrated] = useState(false)

  // Sync with whatever the anti-flash inline script already applied on first paint.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initial = THEMES.some((t) => t.id === stored)
      ? (stored as ThemeId)
      : DEFAULT_THEME
    setThemeState(initial)

    const storedMode = localStorage.getItem(MODE_STORAGE_KEY)
    setModeState(
      COLOR_MODES.some((m) => m.id === storedMode)
        ? (storedMode as ColorMode)
        : DEFAULT_MODE
    )
    setHydrated(true)
  }, [])

  // Resolve "system" and follow OS changes while it's selected.
  useEffect(() => {
    if (!hydrated) return
    if (mode !== "system") {
      setResolvedMode(mode)
      applyMode(mode)
      return
    }
    const mql = window.matchMedia("(prefers-color-scheme: light)")
    const sync = () => {
      const resolved = systemMode()
      setResolvedMode(resolved)
      applyMode(resolved)
    }
    sync()
    mql.addEventListener("change", sync)
    return () => mql.removeEventListener("change", sync)
  }, [mode, hydrated])

  function setTheme(next: ThemeId) {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  function setMode(next: ColorMode) {
    setModeState(next)
    localStorage.setItem(MODE_STORAGE_KEY, next)
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, mode, resolvedMode, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
