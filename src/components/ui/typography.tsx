import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import type { ElementType, ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl leading-tight font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b border-border pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight",
      h6: "scroll-m-20 text-base font-semibold tracking-tight text-muted-foreground",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote:
        "mt-6 border-s-2 border-border ps-6 text-muted-foreground italic",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm leading-none font-medium",
      muted: "text-sm text-muted-foreground",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      list: "my-6 ms-6 list-disc [&>li]:mt-2",
      "ordered-list": "my-6 ms-6 list-decimal [&>li]:mt-2",
      kbd: "rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold shadow-sm",
      mark: "rounded bg-primary/20 px-0.5 text-primary",
      caption: "text-xs leading-4 text-muted-foreground",
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
      "5xl": "text-5xl",
    },
    weight: {
      thin: "font-thin",
      light: "font-light",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    },
    align: {
      start: "text-start",
      center: "text-center",
      end: "text-end",
      justify: "text-justify",
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
      accent: "text-accent-foreground",
    },
    truncate: {
      true: "truncate",
    },
    italic: {
      true: "italic",
    },
    underline: {
      true: "underline underline-offset-4",
    },
  },
})

type TypographyVariants = VariantProps<typeof typographyVariants>

const defaultElementMap = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  blockquote: "blockquote",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
  code: "code",
  list: "ul",
  "ordered-list": "ol",
  kbd: "kbd",
  mark: "mark",
  caption: "p",
} as const satisfies Record<NonNullable<TypographyVariants["variant"]>, string>

type PolymorphicProps<E extends ElementType> = {
  as?: E
  className?: string
} & TypographyVariants &
  Omit<
    ComponentPropsWithoutRef<E>,
    "as" | "className" | keyof TypographyVariants
  >

function Typography<E extends ElementType = "p">({
  as,
  variant,
  size,
  weight,
  align,
  color,
  truncate,
  italic,
  underline,
  className,
  ...props
}: PolymorphicProps<E>) {
  const Tag = as ?? (variant ? defaultElementMap[variant] : "p")

  return (
    <Tag
      data-slot="typography"
      className={cn(
        typographyVariants({
          variant,
          size,
          weight,
          align,
          color,
          truncate,
          italic,
          underline,
        }),
        className
      )}
      {...props}
    />
  )
}

export { Typography, typographyVariants }
export type { TypographyVariants }
