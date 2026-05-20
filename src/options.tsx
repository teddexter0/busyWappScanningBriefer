import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"

import "~style.css"

import { DEFAULT_SETTINGS, getSettings, saveSettings, TIME_WINDOWS } from "~lib/settings"
import type { BrieferSettings, SummaryLength } from "~types"

const SUMMARY_LENGTHS: Array<{ label: string; value: SummaryLength }> = [
  { label: "Short", value: "short" },
  { label: "Standard", value: "standard" },
  { label: "Detailed", value: "detailed" }
]

export default function OptionsPage() {
  const [settings, setSettings] = useState<BrieferSettings>(DEFAULT_SETTINGS)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    getSettings().then(setSettings)

    const loadVoices = () => setVoices(speechSynthesis.getVoices())
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      speechSynthesis.onvoiceschanged = null
    }
  }, [])

  async function updateSettings(next: BrieferSettings) {
    setSettings(next)
    await saveSettings(next)
  }

  return (
    <main className="min-h-screen bg-[#0d1012] px-6 py-8 text-ink">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Scanning Briefer Settings</h1>
          <p className="mt-2 text-sm text-muted">Configure local unread briefings for WhatsApp Web.</p>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-sm font-semibold">Briefing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">Time window</span>
                <select
                  value={settings.timeWindow}
                  onChange={(event) => void updateSettings({ ...settings, timeWindow: event.target.value as BrieferSettings["timeWindow"] })}
                  className="w-full rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-mint"
                >
                  {TIME_WINDOWS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">Summary length</span>
                <select
                  value={settings.summaryLength}
                  onChange={(event) => void updateSettings({ ...settings, summaryLength: event.target.value as SummaryLength })}
                  className="w-full rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-mint"
                >
                  {SUMMARY_LENGTHS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-sm font-semibold">Local AI</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">Ollama model</span>
                <input
                  value={settings.ollamaModel}
                  onChange={(event) => void updateSettings({ ...settings, ollamaModel: event.target.value })}
                  className="w-full rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-mint"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-white/[0.03] px-3 py-2">
                <span>
                  <span className="block text-sm font-medium">Offline fallback only</span>
                  <span className="text-xs text-muted">Skip Ollama and use local extractive summaries.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.offlineMode}
                  onChange={(event) => void updateSettings({ ...settings, offlineMode: event.target.checked })}
                  className="h-4 w-4 accent-mint"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Volume2 className="h-4 w-4 text-mint" />
              Narration
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-white/[0.03] px-3 py-2">
                <span className="text-sm font-medium">Enable narration</span>
                <input
                  type="checkbox"
                  checked={settings.narrationEnabled}
                  onChange={(event) => void updateSettings({ ...settings, narrationEnabled: event.target.checked })}
                  className="h-4 w-4 accent-mint"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">Speed</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={settings.narrationRate}
                  onChange={(event) => void updateSettings({ ...settings, narrationRate: Number(event.target.value) })}
                  className="w-full accent-mint"
                />
                <span className="text-xs text-muted">{settings.narrationRate.toFixed(2)}x</span>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">Voice</span>
                <select
                  value={settings.voiceName ?? ""}
                  onChange={(event) => void updateSettings({ ...settings, voiceName: event.target.value || undefined })}
                  className="w-full rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-mint"
                >
                  <option value="">System default</option>
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
