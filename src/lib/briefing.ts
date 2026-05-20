import type { Briefing, BrieferSettings, ChatSummary } from "~types"

export function buildBriefing(
  summaries: ChatSummary[],
  settings: BrieferSettings,
  source: Briefing["source"]
): Briefing {
  const windowLabel = settings.timeWindow === "1h"
    ? "the last hour"
    : settings.timeWindow === "7d"
      ? "the last 7 days"
      : `the last ${settings.timeWindow.replace("h", " hours")}`

  const intro = `Hey Ted, in ${windowLabel}:`
  const lines = summaries.map((item) => `${item.chatName}: ${item.summary}`)
  const script = [intro, ...lines].join("\n")

  return {
    createdAt: Date.now(),
    window: settings.timeWindow,
    summaries,
    script,
    source
  }
}
