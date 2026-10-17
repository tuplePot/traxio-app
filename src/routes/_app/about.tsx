import { createFileRoute } from "@tanstack/react-router"
import {
  Globe,
  BarChart2,
  Newspaper,
  ShieldCheck,
  Layers,
  Database,
  Zap,
  Code2,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
})

interface Resource {
  icon: React.ElementType
  name: string
  category: string
  description: string
  url: string
  color: string
  badge: string
}

const RESOURCES: Resource[] = [
  {
    icon: BarChart2,
    name: "Binance API",
    category: "Market Data",
    description:
      "Menyediakan data harga OHLCV historis (REST) dan pembaruan harga real-time via WebSocket. Digunakan untuk chart candlestick dan update harga terkini pada Watchlist & Dashboard.",
    url: "https://binance-docs.github.io/apidocs/spot/en/",
    color: "text-yellow-600 dark:text-yellow-500",
    badge: "REST + WebSocket",
  },
  {
    icon: Newspaper,
    name: "Google News RSS",
    category: "Berita Real-time",
    description:
      "Feed RSS dari Google News digunakan untuk mengambil berita terkini berdasarkan nama dan kode simbol aset. Diproses di sisi server (server function) agar tidak terkena CORS dan hasil berita diurutkan dari yang paling baru.",
    url: "https://news.google.com/rss",
    color: "text-blue-500",
    badge: "RSS Feed (Server)",
  },
  {
    icon: Globe,
    name: "TradingView Symbol Search",
    category: "Pencarian Simbol",
    description:
      "API pencarian simbol dari TradingView digunakan pada fitur 'Add Symbol' di halaman Watchlist. Memberikan daftar saham, kripto, forex, dan futures dari seluruh bursa dunia.",
    url: "https://symbol-search.tradingview.com",
    color: "text-sky-500",
    badge: "REST (Server)",
  },
  {
    icon: Zap,
    name: "Lightweight Charts™",
    category: "Visualisasi Chart",
    description:
      "Library chart finansial berperforma tinggi dari TradingView. Digunakan untuk merender candlestick chart interaktif yang mendukung zoom, scroll, dan pembaruan data real-time tanpa mereset posisi tampilan.",
    url: "https://tradingview.github.io/lightweight-charts/",
    color: "text-emerald-500",
    badge: "npm library",
  },
  {
    icon: ShieldCheck,
    name: "Better Auth",
    category: "Autentikasi",
    description:
      "Library autentikasi modern untuk mengelola sesi login pengguna, registrasi akun baru, dan sign-out. Terintegrasi dengan database SQLite via Drizzle adapter.",
    url: "https://www.better-auth.com/",
    color: "text-violet-500",
    badge: "Auth Library",
  },
  {
    icon: Database,
    name: "Drizzle ORM + LibSQL (SQLite)",
    category: "Database",
    description:
      "ORM TypeScript-first yang digunakan untuk query database SQLite lokal. Menyimpan data trades, watchlist, serta tabel-tabel autentikasi (user, session, account, verification).",
    url: "https://orm.drizzle.team/",
    color: "text-orange-500",
    badge: "SQLite (lokal)",
  },
  {
    icon: Layers,
    name: "TanStack Router & Start",
    category: "Framework",
    description:
      "TanStack Router menangani routing client-side dengan type safety penuh. TanStack Start menyediakan server functions (createServerFn) yang memungkinkan kode berjalan di server untuk menghindari CORS dan menjaga keamanan request.",
    url: "https://tanstack.com/start",
    color: "text-red-500",
    badge: "SSR Framework",
  },
  {
    icon: Code2,
    name: "shadcn/ui + Tailwind CSS v4",
    category: "UI & Styling",
    description:
      "Komponen UI yang dibangun di atas Radix UI dan Tailwind CSS v4. Digunakan untuk semua elemen visual seperti Card, Button, Dropdown, Avatar, Badge, Tooltip, dan lainnya.",
    url: "https://ui.shadcn.com/",
    color: "text-foreground",
    badge: "Component Library",
  },
]

const STACK_SUMMARY = [
  { label: "Frontend", value: "React 19 + TanStack Router" },
  { label: "Backend", value: "TanStack Start (Server Functions)" },
  { label: "Database", value: "SQLite via Drizzle ORM" },
  { label: "Auth", value: "Better Auth" },
  { label: "Market Data", value: "Binance REST & WebSocket" },
  { label: "News", value: "Google News RSS" },
  { label: "Charts", value: "Lightweight Charts™ (TradingView)" },
  { label: "Styling", value: "Tailwind CSS v4 + shadcn/ui" },
]

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-lg font-semibold">Tentang Traxio</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Daftar lengkap sumber data, library, dan layanan yang digunakan dalam aplikasi ini.
        </p>
      </div>

      {/* App Description */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Traxio</span> adalah aplikasi trading journal
            dan market analysis yang membantu trader memantau portofolio, mencatat riwayat trade, dan
            menganalisis kondisi pasar secara real-time. Semua data yang ditampilkan bersumber dari
            layanan publik gratis atau open-source — tidak ada data yang dibuat-buat (mock) di
            environment produksi.
          </p>
        </CardContent>
      </Card>

      {/* Tech Stack Summary */}
      <Card>
        <CardHeader className="pb-3">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground">TECH STACK</span>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {STACK_SUMMARY.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-4 px-5 py-3 text-sm ${
                  i < STACK_SUMMARY.length - 2 || STACK_SUMMARY.length % 2 === 0
                    ? "border-b border-border/60"
                    : ""
                }`}
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-3">
          SUMBER DATA &amp; LAYANAN
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RESOURCES.map((res) => {
            const Icon = res.icon
            return (
              <Card
                key={res.name}
                className="group transition-all duration-200 hover:ring-1 hover:ring-border"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className={`size-4 ${res.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{res.name}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {res.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                        {res.category}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {res.description}
                      </p>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline underline-offset-2"
                      >
                        Dokumentasi
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="rounded-lg border border-dashed border-border px-5 py-4">
        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          Semua request ke API eksternal (Binance, Google News, TradingView Symbol Search) dilakukan
          melalui <span className="font-semibold text-foreground">server functions</span> di sisi server
          sehingga kredensial dan request aman dari eksposur langsung ke browser. Data market bersifat
          real-time dan tidak disimpan di database lokal.
        </p>
      </div>
    </div>
  )
}
