import { useState } from "react"
import { Activity, ListChecks, Settings2, Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ActiveTab } from "./types"
import OverviewContent from "./components/detail/OverviewContent"
import DecisionsContent from "./components/detail/DecisionsContent"
import WatchlistContent from "./components/detail/WatchlistContent"
import ConfigContent from "./components/detail/ConfigContent"

/**
 * Body per-tab dari halaman Bot. Nambah tab baru = tambah satu
 * <TabsContent> di sini + satu <TabsTrigger> + komponen di components/detail/.
 */
export default function Content() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview")

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
      {/* Scrolls sideways on narrow screens; taller list keeps the active underline unclipped. */}
      <TabsList
        variant="line"
        className="max-w-full justify-start overflow-x-auto overflow-y-hidden pb-2 group-data-horizontal/tabs:h-10"
      >
        <TabsTrigger value="overview">
          <Activity className="size-3" />
          Ringkasan
        </TabsTrigger>
        <TabsTrigger value="decisions">
          <ListChecks className="size-3" />
          Log Keputusan
        </TabsTrigger>
        <TabsTrigger value="watchlist">
          <Star className="size-3" />
          Watchlist Bot
        </TabsTrigger>
        <TabsTrigger value="config">
          <Settings2 className="size-3" />
          Pengaturan
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewContent />
      </TabsContent>
      <TabsContent value="decisions">
        <DecisionsContent />
      </TabsContent>
      <TabsContent value="watchlist">
        <WatchlistContent />
      </TabsContent>
      <TabsContent value="config">
        <ConfigContent />
      </TabsContent>
    </Tabs>
  )
}
