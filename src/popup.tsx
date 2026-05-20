import { Clock, Loader2, MessageSquareText, Play, Settings as SettingsIcon } from "lucide-react"
import { useEffect, useState } from "react"

import "~style.css"

import { getCachedBriefing } from "~lib/cache"
import { getSettings, saveSettings, TIME_WINDOWS } from "~lib/settings"
import type { Briefing, BrieferSettings, SummarizeRequest, SummarizeResponse } from "~types"

export default function Popup() {
  const [settings, setSettings] = useState<BrieferSettings>()
  const [briefing, setBriefing] = useState<Briefing>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void Promise.all([getSettings(), getCachedBriefing()]).then(([storedSettings, cached]) => {
      setSettings(storedSettings)
      setBriefing(cached)
    })
  }, [])

  async function updateSettings(next: BrieferSettings) {
    setSettings(next)
    await saveSettings(next)
  }

  async function summarizeActiveTab() {
    if (!settings) return
    setBusy(true)
    setError("")

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id || !tab.url?.startsWith("https://web.whatsapp.com/")) {
        setError("Open WhatsApp Web, then run the briefing.")
        return
      }

      const request: SummarizeRequest = {
        type: "SCANNING_BRIEFER_SUMMARIZE",
        settings
      }
      const response = (await chrome.tabs.sendMessage(tab.id, request)) as SummarizeResponse

      if (!response?.ok || !response.briefing) {
        setError(response?.error ?? "The WhatsApp page did not respond.")
        return
      }

      setBriefing(response.briefing)
    } catch {
      setError("Refresh WhatsApp Web after installing the extension, then try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return <div className="w-80 bg-panel p-4 text-sm text-muted">Loading...</div>
  }

  return (
    <div className="w-96 bg-panel text-ink">
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Scanning Briefer</h1>
            <p className="text-xs text-muted">Local unread summaries for WhatsApp Web</p>
          </div>
          <button
            type="button"
            title="Open settings"
            className="rounded-md p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <button
          type="button"
          onClick={summarizeActiveTab}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-mint px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-mint/90 disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
          Summarize Unreads
        </button>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <Clock className="h-3.5 w-3.5" />
            Time window
          </label>
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
        </div>

        {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}

        {briefing && (
          <div className="max-h-72 overflow-y-auto pr-1 sb-scrollbar">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{new Date(briefing.createdAt).toLocaleString()}</span>
              <span>{briefing.source}</span>
            </div>
            <div className="space-y-2">
              {briefing.summaries.map((item) => (
                <div key={item.chatId} className="rounded-md border border-line bg-white/[0.03] p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium">{item.chatName}</div>
                    <div className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] text-mint">
                      {item.unreadCount}
                    </div>
                  </div>
                  <p className="text-sm leading-5 text-muted">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => briefing && speechSynthesis.speak(new SpeechSynthesisUtterance(briefing.script))}
          disabled={!briefing}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:text-ink disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          Play Last Briefing
        </button>
      </div>
    </div>
  )
}
