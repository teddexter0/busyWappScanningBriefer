import { getWindowMs } from "~lib/settings"
import type { BrieferSettings, UnreadChat, UnreadMessage } from "~types"

type CandidateChat = {
  element: HTMLElement
  name: string
  unreadCount: number
}

const CHAT_SETTLE_MS = 850

export async function scanUnreadChats(settings: BrieferSettings): Promise<UnreadChat[]> {
  const candidates = findUnreadChatCandidates()
  const chats: UnreadChat[] = []
  const minTime = Date.now() - getWindowMs(settings.timeWindow)

  for (const candidate of candidates) {
    candidate.element.click()
    await sleep(CHAT_SETTLE_MS)

    const messages = extractVisibleMessages(candidate.unreadCount, minTime)
    if (messages.length === 0) continue

    chats.push({
      id: stableId(candidate.name),
      name: candidate.name,
      unreadCount: candidate.unreadCount,
      lastTimestamp: messages.at(-1)?.timestamp,
      messages
    })
  }

  return chats
}

function findUnreadChatCandidates(): CandidateChat[] {
  const rows = [...document.querySelectorAll<HTMLElement>('[role="listitem"], [aria-label*="Chat list"] [role="row"]')]
  const seen = new Set<HTMLElement>()
  const candidates: CandidateChat[] = []

  for (const row of rows) {
    const root = row.closest<HTMLElement>('[role="listitem"]') ?? row
    if (seen.has(root)) continue
    seen.add(root)

    const unreadCount = extractUnreadCount(root)
    if (unreadCount <= 0) continue

    const name = extractChatName(root)
    if (!name) continue

    candidates.push({ element: root, name, unreadCount })
  }

  return candidates
}

function extractUnreadCount(row: HTMLElement): number {
  const labelled = [
    ...row.querySelectorAll<HTMLElement>('[aria-label*="unread"], [aria-label*="Unread"], [data-icon="unread-count"]')
  ]

  for (const node of labelled) {
    const label = node.getAttribute("aria-label") ?? node.textContent ?? ""
    const count = firstNumber(label)
    if (count > 0) return count
  }

  const numericBadges = [...row.querySelectorAll<HTMLElement>("span, div")]
    .map((node) => node.textContent?.trim() ?? "")
    .filter((text) => /^\d{1,3}$/.test(text))
    .map(Number)

  return numericBadges[0] ?? 0
}

function extractChatName(row: HTMLElement): string {
  const titleNode = row.querySelector<HTMLElement>('[title]')
  const title = titleNode?.getAttribute("title")?.trim()
  if (title && !/^\d{1,2}:\d{2}/.test(title)) return title

  const labelled = row.getAttribute("aria-label")?.trim()
  if (labelled) return labelled.replace(/\d+\s+unread.*$/i, "").trim()

  return [...row.querySelectorAll<HTMLElement>("span[dir='auto']")]
    .map((node) => node.textContent?.trim() ?? "")
    .find((text) => text.length > 1 && !/^\d{1,2}:\d{2}/.test(text)) ?? ""
}

function extractVisibleMessages(unreadCount: number, minTime: number): UnreadMessage[] {
  const textNodes = [
    ...document.querySelectorAll<HTMLElement>(
      "main [data-pre-plain-text], main .selectable-text, [role='application'] [data-pre-plain-text], [role='application'] .selectable-text"
    )
  ]

  const messages = dedupeMessages(textNodes.map(parseMessageNode).filter(Boolean) as UnreadMessage[])
  const withinWindow = messages.filter((message) => !message.parsedAt || message.parsedAt >= minTime)

  if (unreadCount > 0 && withinWindow.length > unreadCount) {
    return withinWindow.slice(-unreadCount)
  }

  return withinWindow
}

function parseMessageNode(node: HTMLElement): UnreadMessage | undefined {
  const bubble = node.closest<HTMLElement>("[data-pre-plain-text]") ?? node
  const text = (node.textContent ?? "").replace(/\s+/g, " ").trim()
  if (!text) return undefined

  const prePlain = bubble.getAttribute("data-pre-plain-text") ?? ""
  const parsed = parsePrePlainText(prePlain)

  return {
    sender: parsed.sender,
    timestamp: parsed.timestamp,
    parsedAt: parsed.parsedAt,
    text
  }
}

function parsePrePlainText(raw: string): Pick<UnreadMessage, "sender" | "timestamp" | "parsedAt"> {
  const match = raw.match(/^\[([^\]]+)]\s([^:]+):/)
  if (!match) return {}

  const timestamp = match[1]
  const sender = match[2].trim()
  return {
    sender,
    timestamp,
    parsedAt: parseWhatsAppDate(timestamp)
  }
}

function parseWhatsAppDate(timestamp: string): number | undefined {
  const normalized = timestamp.replace(",", "")
  const parsed = Date.parse(normalized)
  if (!Number.isNaN(parsed)) return parsed

  const timeOnly = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)?/i)
  if (!timeOnly) return undefined

  const date = new Date()
  let hours = Number(timeOnly[1])
  const minutes = Number(timeOnly[2])
  const meridiem = timeOnly[3]?.toUpperCase()

  if (meridiem === "PM" && hours < 12) hours += 12
  if (meridiem === "AM" && hours === 12) hours = 0

  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

function dedupeMessages(messages: UnreadMessage[]): UnreadMessage[] {
  const seen = new Set<string>()
  return messages.filter((message) => {
    const key = `${message.sender ?? ""}|${message.timestamp ?? ""}|${message.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function firstNumber(text: string): number {
  const match = text.match(/\d+/)
  return match ? Number(match[0]) : 0
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
