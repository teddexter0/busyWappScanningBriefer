import { Storage } from "@plasmohq/storage"

import type { BrieferSettings, TimeWindow } from "~types"

const storage = new Storage({ area: "local" })
const SETTINGS_KEY = "scanningBriefer.settings"

export const TIME_WINDOWS: Array<{ label: string; value: TimeWindow; ms: number }> = [
  { label: "Last 1 hour", value: "1h", ms: 60 * 60 * 1000 },
  { label: "Last 3 hours", value: "3h", ms: 3 * 60 * 60 * 1000 },
  { label: "Last 6 hours", value: "6h", ms: 6 * 60 * 60 * 1000 },
  { label: "Last 24 hours", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 }
]

export const DEFAULT_SETTINGS: BrieferSettings = {
  timeWindow: "24h",
  narrationEnabled: true,
  narrationRate: 1,
  summaryLength: "standard",
  offlineMode: false,
  ollamaModel: "llama3.2"
}

export async function getSettings(): Promise<BrieferSettings> {
  const stored = await storage.get<Partial<BrieferSettings>>(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: BrieferSettings): Promise<void> {
  await storage.set(SETTINGS_KEY, settings)
}

export function getWindowMs(window: TimeWindow): number {
  return TIME_WINDOWS.find((item) => item.value === window)?.ms ?? TIME_WINDOWS[3].ms
}
