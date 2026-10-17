import { Link } from "@tanstack/react-router"
import { LayoutDashboard, TrendingUp, Star, ChevronLeft, ChevronRight, X, Settings2, BarChart2, Bot, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: TrendingUp },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/analysis", label: "Analisis", icon: BarChart2 },
  { to: "/bot", label: "Bot", icon: Bot },
  { to: "/glossary", label: "Glosarium", icon: BookOpen },
] as const

const BOTTOM_NAV_ITEMS = [
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  collapsed,
  onToggle,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "bg-card ring-foreground/5 hidden md:flex h-dvh flex-col ring-1 transition-all duration-300",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} isMobile={false} />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 max-w-[85vw] flex-col bg-card ring-1 ring-foreground/5 transition-transform duration-300 ease-in-out md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          collapsed={false}
          onToggle={onToggle}
          isMobile={true}
          onClose={onMobileClose}
        />
      </aside>
    </>
  )
}

function SidebarContent({
  collapsed,
  onToggle,
  isMobile,
  onClose,
}: {
  collapsed: boolean
  onToggle: () => void
  isMobile: boolean
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 items-center px-4",
          collapsed && !isMobile ? "justify-center" : "justify-between",
        )}
      >
        {(!collapsed || isMobile) && (
          <span className="font-sans text-xs font-bold tracking-widest bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
            TRAXIO
          </span>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="shrink-0 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        )}
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={isMobile ? onClose : undefined}
            title={collapsed && !isMobile ? label : undefined}
            activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            className={cn(
              "text-muted-foreground hover:bg-muted/60 hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              collapsed && !isMobile && "justify-center px-2",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="p-3">
        <Separator className="mb-3" />
        {BOTTOM_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={isMobile ? onClose : undefined}
            title={collapsed && !isMobile ? label : undefined}
            activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            className={cn(
              "text-muted-foreground hover:bg-muted/60 hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              collapsed && !isMobile && "justify-center px-2",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
