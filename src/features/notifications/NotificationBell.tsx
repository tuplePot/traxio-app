import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Typography } from "@/components/ui/typography"
import { markNotificationsRead } from "@/server/bot"
import { notificationsQueryOptions } from "./queries"
import { formatDate } from "@/utils/date"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"

export function NotificationBell() {
  const queryClient = useQueryClient()
  const { data: notifications = [] } = useQuery(notificationsQueryOptions())
  const unread = notifications.filter((n) => !n.read).length

  async function handleOpenChange(open: boolean) {
    if (open || unread === 0) return
    await markNotificationsRead()
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifikasi"
            className="relative text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Notifikasi bot</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <Typography variant="muted" className="px-2 py-3">
            Belum ada notifikasi.
          </Typography>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={<Link to="/bot" />}
              className="flex flex-col items-start gap-0.5"
            >
              <span
                className={cn(
                  "text-sm",
                  !n.read && "font-semibold",
                  n.type === "ERROR" && "text-destructive"
                )}
              >
                {n.title}
              </span>
              <span className="text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(n.createdAt, { withTime: true, format: "short" })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
