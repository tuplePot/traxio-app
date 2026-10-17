import type { ReactNode } from "react"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  footer?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  footer,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("min-h-48", className)}>
      {icon || title || description ? (
        <EmptyHeader>
          {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
          <EmptyTitle>{title}</EmptyTitle>
          {description ? <EmptyDescription>{description}</EmptyDescription> : null}
        </EmptyHeader>
      ) : null}
      {action ? <EmptyContent>{action}</EmptyContent> : null}
      {footer}
    </Empty>
  )
}
