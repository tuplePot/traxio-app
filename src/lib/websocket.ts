import type { OHLCV } from "@/types/trading"

export type WSEvent = "kline" | "trade" | "depth"

interface WSSubscriber {
  event: WSEvent
  callback: (data: unknown) => void
}

interface PendingSubscription {
  stream: string
  payload: object
}

class WebSocketManager {
  private ws: WebSocket | null = null
  private readonly url: string
  private subscribers: WSSubscriber[] = []
  private isConnecting = false
  private reconnectAttempts = 0
  private pendingStreams: PendingSubscription[] = []

  constructor(url = "wss://stream.binance.com:9443/ws") {
    this.url = url
  }

  connect() {
    if (this.ws || this.isConnecting) return
    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.pendingStreams.forEach((sub) => {
          this.ws!.send(JSON.stringify(sub.payload))
        })
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as Record<string, unknown>
        this.notifySubscribers(data)
      }

      this.ws.onclose = () => {
        this.ws = null
        this.isConnecting = false
        this.handleReconnect()
      }

      this.ws.onerror = () => {
        // error handled via onclose
      }
    } catch {
      this.isConnecting = false
      this.handleReconnect()
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.subscribers = []
    this.pendingStreams = []
    this.reconnectAttempts = 0
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= 5) return
    this.reconnectAttempts++
    setTimeout(() => this.connect(), 2000 * this.reconnectAttempts)
  }

  subscribeKline(symbol: string, interval: string, callback: (kline: OHLCV) => void) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`
    const payload = { method: "SUBSCRIBE", params: [stream], id: Date.now() }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
    } else {
      this.pendingStreams.push({ stream, payload })
    }

    this.subscribers.push({
      event: "kline",
      callback: (data) => {
        const d = data as Record<string, unknown>
        if (d["e"] !== "kline") return
        if ((d["s"] as string) !== symbol.toUpperCase()) return
        const k = d["k"] as Record<string, unknown>
        if (k["i"] !== interval) return
        callback({
          time: k["t"] as number,
          open: parseFloat(k["o"] as string),
          high: parseFloat(k["h"] as string),
          low: parseFloat(k["l"] as string),
          close: parseFloat(k["c"] as string),
          volume: parseFloat(k["v"] as string),
        })
      },
    })
  }

  private notifySubscribers(data: Record<string, unknown>) {
    const e = data["e"]
    let eventType: WSEvent | null = null
    if (e === "kline") eventType = "kline"
    else if (e === "trade") eventType = "trade"
    else if (e === "depthUpdate") eventType = "depth"

    if (!eventType) return
    this.subscribers
      .filter((sub) => sub.event === eventType)
      .forEach((sub) => sub.callback(data))
  }
}

export const wsManager = new WebSocketManager()
