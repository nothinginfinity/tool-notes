# Shortcuts

Initial Shortcut concept:

```txt
Send to Tool Notes
```

## V0 flow

1. User copies transcript from Apple Voice Memos.
2. User runs Shortcut.
3. Shortcut reads clipboard.
4. Shortcut asks for title, date, duration, tags, and project.
5. Shortcut sends JSON to `POST /api/notes/ingest`.
6. Worker returns note ID and embedding status.

## Future flow

1. Shortcut receives shared audio/transcript/file.
2. Shortcut posts payload to Tool Notes.
3. Tool Notes handles transcription, storage, embedding, and MCP access.
