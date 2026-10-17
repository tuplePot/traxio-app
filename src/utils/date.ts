const monthsId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

const padZero = (n: number) => String(n).padStart(2, "0")

type DateFormatOptions = {
  withTime?: boolean
  format?: "long" | "short" | "iso"
}

export function formatDate(dateStr: string, options: DateFormatOptions = {}): string {
  if (!dateStr) return "-"
  const { withTime = false, format = "long" } = options
  const date = new Date(dateStr)
  const day = padZero(date.getDate())
  const month = date.getMonth()
  const year = date.getFullYear()

  let datePart: string
  switch (format) {
    case "short":
      datePart = `${day}/${padZero(month + 1)}/${year}`
      break
    case "iso":
      datePart = `${year}-${padZero(month + 1)}-${day}`
      break
    default:
      datePart = date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
  }

  if (!withTime) return datePart

  const timePart = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return `${datePart} ${timePart}`
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return `${padZero(date.getDate())} ${monthsId[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateTimeShort(dateStr: string): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return `${padZero(date.getDate())} ${monthsId[date.getMonth()]} ${date.getFullYear()}, ${padZero(date.getHours())}:${padZero(date.getMinutes())}`
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
