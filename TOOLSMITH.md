# TOOLSMITH.md

## Toolsmith Project: tool-notes

**Project type:** MCP-native voice memory app  
**Primary platform:** iPhone-first, Cloudflare-backed  
**Primary user:** Jared / mobile-first builders  
**Core doctrine:** voice notes for agents, not just humans

---

## 1. Product intent

`tool-notes` is an MCP-compatible replacement for Apple Voice Memos workflows.

Apple Voice Memos can record and transcribe, but it traps the transcript in a human UI. `tool-notes` records or ingests voice transcripts as structured memory and exposes them safely to LLMs.

Core product sentence:

```txt
Tool Notes turns voice into searchable, structured, agent-accessible memory.
```

---

## 2. Workcell fit

This project belongs in the AFO Toolsmith ecosystem as a purpose-built workcell:

```txt
identity + boot instructions + comms spine + project memory + task tools + safety profile + expiration
```

Recommended belt:

```txt
Voice Memory Builder Belt
```

Suggested tools:

- Comms Spine / Agent Bridge Comms MCP
- GitHub MCP
- Cloudflare deploy MCP / mcp-prax
- D1 tooling
- Vector Lab MCP
- Toolsmith Admin MCP
- Optional transcription provider tool
- Optional iPhone Shortcuts Bridge MCP

---

## 3. First Toolsmith-generated MCP

### Tool name

```txt
tool-notes-mcp
```

### Purpose

Expose voice notes, transcripts, summaries, tags, and vector search to LLMs.

### Target endpoint

```txt
https://tool-notes.agentfeedoptimization.com/mcp
```

### Risk level

```txt
medium
```

Read/search tools are low risk. Mutating tools that create, tag, or delete notes are medium/high depending on scope.

---

## 4. Required tools

### `deployment_status`

Return worker status, binding presence, database status, vector status, and tool count.

### `note_ingest_transcript`

Accept transcript text plus metadata and store it.

Input:

```json
{
  "title": "Focus: Brain Graph",
  "recorded_at": "2026-02-13T09:33:00Z",
  "duration_seconds": 436,
  "transcript": "...",
  "tags": ["voice", "brainstorm"],
  "projects": ["afo-toolsmith"]
}
```

Output:

```json
{
  "note_id": "note_...",
  "chunks": 8,
  "embedding_status": "queued"
}
```

### `note_ingest_audio`

Accept an audio file URL or base64/file reference, then transcribe and store.

V1 may defer direct audio upload and only accept transcript ingest.

### `note_list_recent`

List recent notes.

### `note_get`

Return one full note by ID.

### `note_search`

Keyword search over title/transcript/tags/projects.

### `note_semantic_search`

Vector search over embedded note chunks.

### `note_summarize`

Summarize a note or search result set.

### `note_extract_tasks`

Extract tasks, decisions, ideas, and follow-ups from a note.

### `note_extract_entities`

Extract people, places, projects, products, dates, and topics.

### `note_tag`

Add or remove tags/projects from a note.

### `note_export_markdown`

Export a note as markdown for Obsidian/GitHub.

---

## 5. Required non-MCP API endpoints

These are for the mobile app or Shortcut, not the LLM client.

### `POST /api/notes/ingest`

Shortcut/native app transcript ingestion.

### `POST /api/audio/upload`

Optional future audio ingestion.

### `GET /api/notes/:id`

App UI note retrieval.

### `GET /api/search?q=...`

App UI search.

### `POST /mcp`

MCP endpoint for LLM tools.

---

## 6. Storage plan

### D1

Structured database for:

- notes
- note_chunks
- tags
- projects
- ingest_events
- app_settings

### R2

Optional audio file storage.

### Vectorize

Semantic search over note chunks.

Recommended index:

```txt
tool-notes-memory
```

If a dedicated index is not available, namespace vectors strongly in an existing index:

```txt
tool_notes:note_id:chunk_index
```

---

## 7. Safety model

Rules:

1. Never expose all notes by default.
2. Search/list tools should support limits.
3. Delete tools should be omitted from v0.1.
4. Audio files should be private by default.
5. User must explicitly choose note/project exposure.
6. Mutating tools should return IDs and change summaries.
7. Keep raw transcript access separate from summary access.
8. Never return secret values.
9. Ingest endpoints should require an ingest token.
10. MCP endpoint should use scoped auth once public.

---

## 8. MVP phases

### Phase 0: Repo + static UI

- README
- TOOLSMITH.md
- HTML product UI/spec

### Phase 1: Shortcut transcript ingest

- Shortcut reads clipboard transcript
- Shortcut sends JSON to Worker
- Worker stores in D1
- Worker embeds chunks
- MCP can search and retrieve

### Phase 2: Native/mobile recording

- Record inside app
- Transcribe automatically
- Save and embed automatically

### Phase 3: Bulk import

- Import old Apple Voice Memos
- Use copied transcripts where possible
- Re-transcribe audio when necessary

### Phase 4: Agentic workflows

- Extract tasks to GitHub/Reminders
- Link notes to projects/workcells
- Create specs from voice memos
- Generate daily/weekly idea digests

---

## 9. Toolsmith catalogue draft

```json
{
  "id": "tool_10_tool_notes",
  "name": "Tool Notes MCP",
  "description": "MCP-native voice memory: ingest, search, summarize, tag, and reason over voice notes and transcripts.",
  "connector_id": "conn_tool_notes",
  "connector_url": "https://tool-notes.agentfeedoptimization.com/mcp",
  "risk_profile": "medium",
  "bundle": "voice-memory",
  "tags": ["voice", "notes", "transcription", "vector-search", "iphone", "mcp-native"]
}
```

### Connector draft

```json
{
  "id": "conn_tool_notes",
  "name": "Tool Notes MCP",
  "url": "https://tool-notes.agentfeedoptimization.com/mcp",
  "transport": "http",
  "auth": "bearer_or_ingest_token",
  "status": "planned"
}
```

### Belt draft

```json
{
  "id": "belt_voice_memory",
  "name": "Voice Memory Belt",
  "description": "Record, ingest, search, and operationalize voice notes through MCP.",
  "connectors": [
    "conn_agent_bridge_comms",
    "conn_tool_notes",
    "conn_vector_lab",
    "conn_toolsmith_admin"
  ]
}
```

---

## 10. Open decisions

1. Will v1 use Shortcuts only, native app only, or both?
2. Which transcription provider is the first default?
3. Should audio files be stored, or only transcripts?
4. Should Obsidian export be built into v1?
5. Should the app be public product, private Jared tool, or Toolsmith-generated template?
