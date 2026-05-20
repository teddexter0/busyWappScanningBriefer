# Scanning Briefer

Scanning Briefer is a Chrome extension MVP for WhatsApp Web. It scans unread chats, groups unread messages by conversation, and turns them into a short local-first briefing.

## Features

- Floating **Summarize Unreads** button inside WhatsApp Web
- Time windows: 1 hour, 3 hours, 6 hours, 24 hours, 7 days
- One concise sentence per unread chat or group
- Browser text-to-speech narration with speed control
- Local cache via `chrome.storage.local`
- Local AI path through Ollama at `http://localhost:11434`
- Extractive fallback when Ollama is unavailable

## Development

```bash
npm install
npm run dev
```

Then load the generated development extension in Chrome and open `https://web.whatsapp.com`.

## Local AI

Install and run Ollama locally, then pull a compact model:

```bash
ollama pull llama3.2
ollama serve
```

The extension does not upload WhatsApp content to a cloud service by default.

## Notes

WhatsApp Web does not expose a public extension API. The scraper uses defensive DOM heuristics and may need selector updates if WhatsApp changes its interface.
