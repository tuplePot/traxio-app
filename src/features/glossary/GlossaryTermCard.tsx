import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import type { GlossaryTerm } from "./terms"

interface GlossaryTermCardProps {
  term: GlossaryTerm
}

export function GlossaryTermCard({ term }: GlossaryTermCardProps) {
  return (
    <Card id={term.id} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{term.term}</CardTitle>
        {term.fullName && <CardDescription>{term.fullName}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Typography size="sm" className="leading-relaxed">
          {term.summary}
        </Typography>

        {term.howToRead && (
          <Section label="Cara baca">
            <ul className="ms-4 flex list-disc flex-col gap-1">
              {term.howToRead.map((line, i) => (
                <Typography as="li" key={i} size="sm" color="muted" className="leading-snug">
                  {line}
                </Typography>
              ))}
            </ul>
          </Section>
        )}

        {term.inTraxio && (
          <Section label="Di Traxio">
            <Typography size="sm" color="muted" className="leading-snug">
              {term.inTraxio}
            </Typography>
          </Section>
        )}

        {term.example && (
          <Section label="Contoh">
            <Typography size="sm" color="muted" className="rounded-md bg-muted/50 px-3 py-2 leading-snug">
              {term.example}
            </Typography>
          </Section>
        )}
      </CardContent>
    </Card>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography size="xs" weight="semibold" color="muted" className="tracking-widest uppercase">
        {label}
      </Typography>
      {children}
    </div>
  )
}
