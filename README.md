# tool-notes

**MCP-native voice notes for agents, not just humans.**

`tool-notes` is a mobile-first voice memory app concept for recording, transcribing, structuring, embedding, and exposing voice notes to LLMs through MCP tools.

The first product wedge replaces the Apple Voice Memos workaround with an agent-native memory flow:

```txt
Record voice note
→ transcribe
→ store transcript + metadata
→ chunk + embed
→ search through MCP
→ summarize, tag, extract tasks, and reason with LLMs
```

## Why this exists

Apple Voice Memos is useful for humans, but it is not agent-compatible software. It can record and show transcripts, but it does not expose a clean, scoped, MCP-compatible tool surface for ChatGPT, Claude, or other agents to search, retrieve, or operate on the recordings.

`tool-notes` is designed around the opposite principle:

```txt
Every note is born as structured, searchable, agent-accessible memory.
```

## Product doctrine

```txt
MCP-compatible software = software that exposes its state and actions to agents through safe, scoped tools.
```

For voice notes, that means:

- Recordings are transcribed automatically.
- Transcripts are stored as structured records.
- Chunks are embedded into a vector database.
- Agents access the notes through MCP, not UI scraping.
- Users control which notes, tags, projects, and memories are exposed.

## Initial architecture

```txt
iPhone / mobile recorder
→ Cloudflare ingest endpoint
→ D1 structured database
→ Workers AI transcription / external transcription provider
→ chunking
→ Vectorize embeddings
→ MCP tools
→ ChatGPT / Claude / other agents
```

## MVP flows

### V0: Shortcut bridge

Use this while the native app is still being built.

```txt
Voice Memos
→ Copy Transcript
→ Shortcut
→ POST /api/notes/ingest
→ D1 + Vectorize
→ MCP search tools
```

### V1: Native voice memory app

```txt
Open Tool Notes
→ record
→ auto-transcribe
→ auto-store
→ auto-embed
→ search through MCP
```

### V2: Bulk import

```txt
Import old Voice Memos
→ parse or re-transcribe
→ store
→ embed
→ dedupe
→ tag
```

## Core MCP tools

```txt
note_create
note_ingest_transcript
note_ingest_audio
note_list_recent
note_get
note_search
note_semantic_search
note_summarize
note_extract_tasks
note_extract_entities
note_tag
note_link_project
note_export_markdown
```

## Suggested Cloudflare stack

- Cloudflare Worker: app API + MCP endpoint
- D1: structured note metadata and transcript rows
- R2: optional audio storage
- Vectorize: transcript chunk embeddings
- Workers AI: embedding generation and possible transcription/summarization
- GitHub: specs, handoffs, changelog, generated artifacts

## Data model

### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'tool_notes',
  recorded_at TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  tags TEXT,
  projects TEXT,
  audio_url TEXT,
  embedding_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `note_chunks`

```sql
CREATE TABLE note_chunks (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_seconds REAL,
  end_seconds REAL,
  vector_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);
```

## Repo layout

```txt
tool-notes/
  README.md
  TOOLSMITH.md
  index.html
  docs/
    html-spec.md
  src/
    worker.js
    schema.sql
  shortcuts/
    README.md
```

This starter repo currently includes the README, Toolsmith plan, and a static HTML UI/spec.
