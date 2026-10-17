import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  isLoading: boolean
  label?: string
  icon?: ReactNode
  className?: string
  children?: ReactNode
  /** Nutup seluruh viewport (fixed inset-0) dengan spinner lebih besar. Default true. */
  fullScreen?: boolean
}

export function LoadingScreen({
  isLoading,
  label = "LOADING...",
  icon,
  className,
  children,
  fullScreen = true,
}: LoadingScreenProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen
          ? "fixed inset-0 z-50 bg-background"
          : "min-h-48 flex-1",
        className
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon ?? (
          <Loader2
            className={cn("animate-spin", fullScreen ? "size-8" : "size-4")}
          />
        )}
        <span
          className={cn(
            "font-semibold tracking-widest",
            fullScreen ? "text-xs" : "text-[10px]"
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
