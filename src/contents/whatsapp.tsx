import type { PlasmoCSConfig } from "plasmo"
import { Loader2, Pause, Play, Settings, Volume2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import "~style.css"

import { buildBriefing } from "~lib/briefing"
import { cacheBriefing } from "~lib/cache"
import { DEFAULT_SETTINGS, getSettings, saveSettings, TIME_WINDOWS } from "~lib/settings"
import { summarizeChats } from "~lib/summarizer"
import { scanUnreadChats } from "~lib/whatsappScraper"
import type { Briefing, BrieferSettings, SummarizeRequest, SummarizeResponse } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://web.whatsapp.com/*"],
  all_frames: false
}

export default function WhatsAppBrieferOverlay() {
  const [settings, setSettings] = useState<BrieferSettings>(DEFAULT_SETTINGS)
  const [briefing, setBriefing] = useState<Briefing>()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)

    const observer = new MutationObserver(() => {
      const count = document.querySelectorAll('[aria-label*="unread"], [data-icon="unread-count"]').length
      document.documentElement.dataset.scanningBrieferUnreadMarkers = String(count)
    })

    observer.observe(document.body, { subtree: true, childList: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message: SummarizeRequest, _sender, sendResponse) => {
      if (message.type !== "SCANNING_BRIEFER_SUMMARIZE") return false

      void runSummary(message.settings).then((response) => sendResponse(response))
      return true
    })
  }, [settings])

  const currentWindow = useMemo(
    () => TIME_WINDOWS.find((item) => item.value === settings.timeWindow)?.label ?? "Last 24 hours",
    [settings.timeWindow]
  )

  async function updateSettings(next: BrieferSettings) {
    setSettings(next)
    await saveSettings(next)
  }

  async function runSummary(nextSettings = settings): Promise<SummarizeResponse> {
    setBusy(true)
    setOpen(true)
    setError("")
    speechSynthesis.cancel()
    setSpeaking(false)

    try {
      const chats = await scanUnreadChats(nextSettings)
      const { summaries, source } = await summarizeChats(chats, nextSettings)
      const nextBriefing = buildBriefing(summaries, nextSettings, source)
      setBriefing(nextBriefing)
      await cacheBriefing(nextBriefing)

      if (nextSettings.narrationEnabled && nextBriefing.summaries.length > 0) {
        speak(nextBriefing.script, nextSettings)
      }

      return { ok: true, briefing: nextBriefing }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "Unable to scan WhatsApp Web."
      setError(message)
      return { ok: false, error: message }
    } finally {
      setBusy(false)
    }
  }

  function speak(script: string, activeSettings = settings) {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(script)
    utterance.rate = activeSettings.narrationRate
    const voice = speechSynthesis.getVoices().find((item) => item.name === activeSettings.voiceName)
    if (voice) utterance.voice = voice
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    speechSynthesis.speak(utterance)
  }

  function toggleSpeech() {
    if (!briefing) return
    if (speaking) {
      speechSynthesis.pause()
      setSpeaking(false)
      return
    }

    if (speechSynthesis.paused) {
      speechSynthesis.resume()
      setSpeaking(true)
      return
    }

    speak(briefing.script)
  }

  return (
    <div className="fixed bottom-5 right-5 z-[999999] font-sans text-ink">
      <button
        type="button"
        onClick={() => void runSummary()}
        className="flex items-center gap-2 rounded-full border border-line bg-panel/95 px-4 py-3 text-sm font-medium shadow-briefer backdrop-blur transition hover:border-mint/50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4 text-mint" />}
        Summarize Unreads
      </button>

      {open && (
        <div className="mt-3 w-[min(420px,calc(100vw-40px))] overflow-hidden rounded-lg border border-line bg-panel shadow-briefer">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Unread Briefing</div>
              <div className="text-xs text-muted">{currentWindow}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSpeech}
                disabled={!briefing}
                className="rounded-md p-2 text-muted transition hover:bg-white/10 hover:text-ink disabled:opacity-40"
                title={speaking ? "Pause narration" : "Play narration"}
              >
                {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => chrome.runtime.openOptionsPage()}
                className="rounded-md p-2 text-muted transition hover:bg-white/10 hover:text-ink"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-muted transition hover:bg-white/10 hover:text-ink"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              {TIME_WINDOWS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => void updateSettings({ ...settings, timeWindow: item.value })}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                    settings.timeWindow === item.value
                      ? "border-mint bg-mint/10 text-ink"
                      : "border-line bg-white/[0.03] text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {busy && (
              <div className="flex items-center gap-2 rounded-md border border-line bg-white/[0.03] p-3 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin text-mint" />
                Scanning unread chats and summarizing locally.
              </div>
            )}

            {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}

            {briefing && !busy && (
              <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1 sb-scrollbar">
                {briefing.summaries.length === 0 ? (
                  <div className="rounded-md border border-line bg-white/[0.03] p-3 text-sm text-muted">
                    No unread messages were found in this window.
                  </div>
                ) : (
                  briefing.summaries.map((item) => (
                    <div key={item.chatId} className="rounded-md border border-line bg-white/[0.03] p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium">{item.chatName}</div>
                        <div className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-xs text-mint">
                          {item.unreadCount} unread
                        </div>
                      </div>
                      <p className="text-sm leading-5 text-muted">{item.summary}</p>
                      {item.lastTimestamp && <div className="mt-2 text-[11px] text-muted/80">{item.lastTimestamp}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {briefing && <div className="text-[11px] text-muted">Summary source: {briefing.source}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
