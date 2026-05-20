export type TimeWindow = "1h" | "3h" | "6h" | "24h" | "7d"

export type SummaryLength = "short" | "standard" | "detailed"

export type BrieferSettings = {
  timeWindow: TimeWindow
  narrationEnabled: boolean
  narrationRate: number
  voiceName?: string
  summaryLength: SummaryLength
  offlineMode: boolean
  ollamaModel: string
}

export type UnreadMessage = {
  sender?: string
  text: string
  timestamp?: string
  parsedAt?: number
}

export type UnreadChat = {
  id: string
  name: string
  unreadCount: number
  lastTimestamp?: string
  messages: UnreadMessage[]
}

export type ChatSummary = {
  chatId: string
  chatName: string
  unreadCount: number
  lastTimestamp?: string
  summary: string
}

export type Briefing = {
  createdAt: number
  window: TimeWindow
  summaries: ChatSummary[]
  script: string
  source: "ollama" | "fallback" | "mixed"
}

export type SummarizeRequest = {
  type: "SCANNING_BRIEFER_SUMMARIZE"
  settings: BrieferSettings
}

export type SummarizeResponse = {
  ok: boolean
  briefing?: Briefing
  error?: string
}
