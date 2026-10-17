import { useState } from "react"
import { Bell, DollarSign, Palette } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ActiveTab } from "./types"
import CurrencyDisplayContent from "./detail/CurrencyDisplayContent"
import NotificationsContent from "./detail/NotificationsContent"
import ThemesContent from "./detail/ThemesContent"

/**
 * Body per-tab dari halaman Settings. Nambah tab baru = tambah satu
 * <TabsContent> di sini + satu <TabsTrigger> + komponen di detail/.
 */
export default function Content() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("currency display")

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
      <TabsList variant="line">
        <TabsTrigger value="currency display">
          <DollarSign className="size-3" />
          Mata Uang
        </TabsTrigger>
        <TabsTrigger value="themes">
          <Palette className="size-3" />
          Tema
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="size-3" />
          Notifikasi
        </TabsTrigger>
      </TabsList>
      <TabsContent value="currency display">
        <CurrencyDisplayContent />
      </TabsContent>

      <TabsContent value="themes">
        <ThemesContent />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationsContent />
      </TabsContent>
    </Tabs>
  )
}
