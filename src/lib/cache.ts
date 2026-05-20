import { Storage } from "@plasmohq/storage"

import type { Briefing } from "~types"

const storage = new Storage({ area: "local" })
const LAST_BRIEFING_KEY = "scanningBriefer.lastBriefing"

export async function cacheBriefing(briefing: Briefing): Promise<void> {
  await storage.set(LAST_BRIEFING_KEY, briefing)
}

export async function getCachedBriefing(): Promise<Briefing | undefined> {
  return storage.get<Briefing>(LAST_BRIEFING_KEY)
}
