import type { BrieferSettings, ChatSummary, UnreadChat, UnreadMessage } from "~types"

type LocalSummaryResult = {
  summary: string
  source: "ollama" | "fallback"
}

const LOW_INFORMATION_PATTERNS = [
  /^(ok|okay|k|lol|lmao|haha|hehe|yes|no|thanks|thx|👍|😂|😭|🙏|🔥)+$/i,
  /sticker omitted/i,
  /image omitted/i,
  /video omitted/i,
  /gif omitted/i,
  /message deleted/i
]

export async function summarizeChats(
  chats: UnreadChat[],
  settings: BrieferSettings
): Promise<{ summaries: ChatSummary[]; source: "ollama" | "fallback" | "mixed" }> {
  const summaries: ChatSummary[] = []
  const sources = new Set<"ollama" | "fallback">()

  for (const chat of chats) {
    const result = await summarizeChat(chat, settings)
    sources.add(result.source)
    summaries.push({
      chatId: chat.id,
      chatName: chat.name,
      unreadCount: chat.unreadCount,
      lastTimestamp: chat.lastTimestamp,
      summary: result.summary
    })
  }

  return {
    summaries,
    source: sources.size === 1 ? [...sources][0] : "mixed"
  }
}

async function summarizeChat(chat: UnreadChat, settings: BrieferSettings): Promise<LocalSummaryResult> {
  const transcript = buildTranscript(chat.messages)

  if (!transcript) {
    return {
      summary: "Only low-information messages were detected.",
      source: "fallback"
    }
  }

  if (!settings.offlineMode) {
    const ollama = await summarizeWithOllama(chat.name, transcript, settings)
    if (ollama) {
      return { summary: ollama, source: "ollama" }
    }
  }

  return {
    summary: fallbackSummary(chat.name, chat.messages, settings.summaryLength),
    source: "fallback"
  }
}

function buildTranscript(messages: UnreadMessage[]): string {
  return messages
    .map((message) => normalizeMessage(message))
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000)
}

function normalizeMessage(message: UnreadMessage): string {
  const text = message.text.replace(/\s+/g, " ").trim()
  if (!text || LOW_INFORMATION_PATNS_MATCH(text)) return ""
  return message.sender ? `${message.sender}: ${text}` : text
}

function LOW_INFORMATION_PATNS_MATCH(text: string): boolean {
  return LOW_INFORMATION_PATTERNS.some((pattern) => pattern.test(text))
}

async function summarizeWithOllama(
  chatName: string,
  transcript: string,
  settings: BrieferSettings
): Promise<string | undefined> {
  const targetLength = settings.summaryLength === "short"
    ? "12 words or fewer"
    : settings.summaryLength === "detailed"
      ? "one sentence under 32 words"
      : "one sentence under 22 words"

  const prompt = [
    "Summarize this unread WhatsApp conversation into one concise practical sentence for a notification briefing.",
    `Chat/group: ${chatName}`,
    `Length: ${targetLength}.`,
    "Prioritize requests to the user, scheduling, deadlines, urgent emotions, repeated mentions, links, and files.",
    "Ignore spam, repeated memes, stickers, reactions, and low-information chatter unless dominant.",
    "Do not invent details. Do not quote the full messages. Return only the sentence.",
    "",
    transcript
  ].join("\n")

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 80
        }
      })
    })

    if (!response.ok) return undefined
    const data = await response.json()
    return sanitizeSentence(String(data.response ?? ""))
  } catch {
    return undefined
  }
}

function fallbackSummary(chatName: string, messages: UnreadMessage[], length: BrieferSettings["summaryLength"]): string {
  const useful = messages
    .map((message) => normalizeMessage(message))
    .filter(Boolean)

  if (useful.length === 0) return "Only low-information messages were detected."

  const prioritized = [...useful].sort((a, b) => scoreLine(b) - scoreLine(a))
  const top = prioritized.slice(0, length === "detailed" ? 3 : 2).map(stripSender)
  const topic = compressText(top.join("; "))

  return sanitizeSentence(`${chatName} ${topic}`)
}

function scoreLine(line: string): number {
  const lower = line.toLowerCase()
  let score = 0
  if (/[?]/.test(line)) score += 4
  if (/\b(apply|deadline|due|today|tomorrow|meeting|class|cat|exam|assignment|call|urgent|where|when|link|file|pdf|remote|internship)\b/.test(lower)) {
    score += 5
  }
  if (/\b(ted|you|your|bro|please|pls)\b/.test(lower)) score += 3
  if (/https?:\/\//.test(lower)) score += 3
  return score
}

function stripSender(line: string): string {
  return line.replace(/^[^:]{1,40}:\s*/, "")
}

function compressText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(hi|hey|hello)\b/gi, "")
    .trim()
    .slice(0, 180)
}

function sanitizeSentence(text: string): string {
  const cleaned = text
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return "Unread messages did not contain enough clear information to summarize."
  const sentence = cleaned.replace(/[.!?]+$/g, "")
  return `${sentence}.`
}
