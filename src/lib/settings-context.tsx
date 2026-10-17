import { createContext, useContext } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { updateSettings as updateSettingsFn } from "@/server/settings"
import type { SettingsWithRate } from "@/server/settings"

export type { SettingsWithRate }

interface UpdateData {
  currency?: "USD" | "IDR"
  customUsdToIdr?: number
}

interface SettingsContextValue {
  settings: SettingsWithRate
  update: (data: UpdateData) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider")
  return ctx
}

export function SettingsProvider({
  settings,
  children,
}: {
  settings: SettingsWithRate
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()

  async function update(data: UpdateData) {
    await updateSettingsFn({ data })
    queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}
