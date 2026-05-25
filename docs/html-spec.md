# Tool Notes HTML Spec

## Purpose

The static UI in `index.html` frames Tool Notes as an MCP-native voice memory application.

## Primary product message

```txt
Voice notes for agents, not just humans.
```

## User problem

Apple Voice Memos can record and transcribe, but it does not expose a clean MCP-compatible surface for LLMs to search, retrieve, summarize, tag, or operationalize voice recordings.

## MVP product flow

```txt
Voice Memos / Shortcut / native recorder
→ transcript ingest
→ D1
→ Vectorize
→ MCP tools
→ ChatGPT / Claude
```

## Page sections

1. Hero: MCP-native voice memory.
2. Why: human-first versus agent-first voice software.
3. Flow: record, transcribe, store, embed, use.
4. MCP surface: proposed tool list.
5. Spec cards: ingest endpoint and MCP endpoint.
6. Roadmap: phases 0 through 5.

## Design notes

- Dark mobile-first interface.
- iPhone-style recorder mockup.
- Agent-memory language.
- Cloudflare/MCP compatible architecture.
