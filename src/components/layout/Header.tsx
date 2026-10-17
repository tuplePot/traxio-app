import { authClient } from "@/lib/auth-client"
import { useNavigate } from "@tanstack/react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Menu, Moon, Sun } from "lucide-react"
import { NotificationBell } from "@/features/notifications/NotificationBell"
import { useTheme } from "@/lib/theme-context"
import { detachPushFromAccount } from "@/features/notifications/push-client"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const { resolvedMode, setMode } = useTheme()

  const initials = session?.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  async function handleLogout() {
    // Selagi sesi masih valid: lepas perangkat ini dari akun supaya alert
    // akun ini tidak lagi masuk ke browser yang sudah logout.
    await detachPushFromAccount()
    await authClient.signOut()
    navigate({ to: "/login" })
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-card px-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="mr-1 shrink-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground md:hidden"
          >
            <Menu className="size-4" />
          </Button>
        )}
        <p className="hidden text-sm font-medium text-muted-foreground sm:block">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-xs font-medium text-muted-foreground sm:hidden">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={
            resolvedMode === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"
          }
          onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          {resolvedMode === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <Avatar className="size-8 cursor-pointer">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{session?.user.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {session?.user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
