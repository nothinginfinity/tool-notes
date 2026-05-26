/**
 * tool-notes — v0.1.0 — Phase 1: Shortcut transcript ingest + MCP search/retrieve
 * AFO Mobile MCP Protocol — POST /mcp, hand-rolled JSON-RPC, no npm, no SSE
 * DB: message-os-cloud-db (shared, notes/note_chunks tables namespaced)
 * Workers.dev: https://tool-notes.jaredtechfit.workers.dev
 * Custom domain: https://tool-notes.agentfeedoptimization.com (add in Domains tab)
 */

const VERSION = '0.1.0';
const WORKER  = 'tool-notes';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ingest-Token',
};

function ok(id, result) {
  return Response.json(
    { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } },
    { headers: CORS }
  );
}
function rpcErr(id, code, message) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: CORS });
}
function J(x, s = 200) { return Response.json(x, { status: s, headers: CORS }); }
function now() { return new Date().toISOString(); }
function uid() { return 'note_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18); }
function chunkUid() { return 'chunk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18); }

async function initDB(env) {
  if (!env.DB) throw new Error('DB binding missing');
  const stmts = [
    `CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'tool_notes', recorded_at TEXT, duration_seconds INTEGER, transcript TEXT, summary TEXT, tags TEXT, projects TEXT, audio_url TEXT, embedding_status TEXT DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS note_chunks (id TEXT PRIMARY KEY, note_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, text TEXT NOT NULL, start_seconds REAL, end_seconds REAL, vector_id TEXT, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_recorded_at ON notes(recorded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_note_chunks_note_id ON note_chunks(note_id)`,
  ];
  for (const sql of stmts) { try { await env.DB.prepare(sql).run(); } catch (_) {} }
}

function chunkTranscript(text, noteId, ts) {
  const words = text.trim().split(/\s+/);
  const size = 300;
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push({ id: chunkUid(), note_id: noteId, chunk_index: Math.floor(i / size), text: words.slice(i, i + size).join(' '), created_at: ts });
  }
  return chunks;
}

async function ingestNote(env, data) {
  await initDB(env);
  const { title, transcript, recorded_at, duration_seconds, tags, projects, source = 'shortcut', audio_url } = data;
  if (!title || !transcript) throw new Error('title and transcript are required');
  const id = uid(), ts = now();
  await env.DB.prepare(
    `INSERT INTO notes(id,title,source,recorded_at,duration_seconds,transcript,tags,projects,audio_url,embedding_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'pending',?,?)`
  ).bind(id, title, source, recorded_at || ts, duration_seconds || null, transcript,
    tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null,
    projects ? JSON.stringify(Array.isArray(projects) ? projects : [projects]) : null,
    audio_url || null, ts, ts).run();
  const chunks = chunkTranscript(transcript, id, ts);
  for (const c of chunks) {
    await env.DB.prepare(`INSERT INTO note_chunks(id,note_id,chunk_index,text,created_at) VALUES(?,?,?,?,?)`).bind(c.id, c.note_id, c.chunk_index, c.text, c.created_at).run();
  }
  return { note_id: id, title, chunks: chunks.length, embedding_status: 'pending' };
}

const TOOLS = [
  { name: 'deployment_status', description: 'Health check — returns worker status, binding presence, and tool list.', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'note_ingest_transcript', description: 'Ingest a voice note transcript. Stores in D1 and chunks for future embedding.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, transcript: { type: 'string' }, recorded_at: { type: 'string' }, duration_seconds: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } }, projects: { type: 'array', items: { type: 'string' } } }, required: ['title', 'transcript'] } },
  { name: 'note_list_recent', description: 'List recent notes, newest first.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, required: [] } },
  { name: 'note_get', description: 'Get a single note by ID including full transcript.', inputSchema: { type: 'object', properties: { note_id: { type: 'string' } }, required: ['note_id'] } },
  { name: 'note_search', description: 'Keyword search across note titles, transcripts, tags, and projects.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, limit: { type: 'number' } }, required: ['q'] } },
  { name: 'note_tag', description: 'Add tags or projects to a note.', inputSchema: { type: 'object', properties: { note_id: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, projects: { type: 'array', items: { type: 'string' } } }, required: ['note_id'] } },
  { name: 'note_export_markdown', description: 'Export a note as markdown.', inputSchema: { type: 'object', properties: { note_id: { type: 'string' } }, required: ['note_id'] } },
];

async function handleMCP(request, env) {
  let body;
  try { body = await request.json(); } catch { return rpcErr(null, -32700, 'Parse error'); }
  const { id, method, params } = body;
  if (method === 'initialize') return Response.json({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: WORKER, version: VERSION } } }, { headers: CORS });
  if (method === 'notifications/initialized') return new Response(null, { status: 204, headers: CORS });
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    try {
      let result;
      switch (name) {
        case 'deployment_status': {
          let tc = 0; try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM sqlite_master WHERE type='table'`).first(); tc = r?.n ?? 0; } catch(_){}
          result = { worker: WORKER, version: VERSION, status: 'ok', protocol: 'AFO Mobile MCP Protocol', bindings: { DB: !!env.DB }, db_tables: tc, tools: TOOLS.map(t => t.name) }; break;
        }
        case 'note_ingest_transcript': result = await ingestNote(env, args); break;
        case 'note_list_recent': {
          await initDB(env);
          const limit = Math.min(Number(args.limit) || 10, 50);
          const rows = await env.DB.prepare(`SELECT id,title,source,recorded_at,duration_seconds,tags,projects,embedding_status,created_at FROM notes ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
          result = { notes: rows.results || [], count: (rows.results || []).length }; break;
        }
        case 'note_get': {
          await initDB(env);
          const note = await env.DB.prepare(`SELECT * FROM notes WHERE id=?`).bind(args.note_id).first();
          if (!note) throw new Error(`Note not found: ${args.note_id}`);
          const chunks = await env.DB.prepare(`SELECT chunk_index,text FROM note_chunks WHERE note_id=? ORDER BY chunk_index`).bind(args.note_id).all();
          result = { ...note, chunks: chunks.results || [] }; break;
        }
        case 'note_search': {
          await initDB(env);
          const q = String(args.q || '').trim();
          if (!q) throw new Error('q is required');
          const limit = Math.min(Number(args.limit) || 10, 50);
          const pat = `%${q}%`;
          const rows = await env.DB.prepare(`SELECT id,title,source,recorded_at,tags,projects,created_at,substr(transcript,1,300) as transcript_preview FROM notes WHERE title LIKE ? OR transcript LIKE ? OR tags LIKE ? OR projects LIKE ? ORDER BY created_at DESC LIMIT ?`).bind(pat,pat,pat,pat,limit).all();
          result = { query: q, results: rows.results || [], count: (rows.results || []).length }; break;
        }
        case 'note_tag': {
          await initDB(env);
          const note = await env.DB.prepare(`SELECT tags,projects FROM notes WHERE id=?`).bind(args.note_id).first();
          if (!note) throw new Error(`Note not found: ${args.note_id}`);
          const existingTags = note.tags ? JSON.parse(note.tags) : [];
          const existingProjects = note.projects ? JSON.parse(note.projects) : [];
          const newTags = [...new Set([...existingTags, ...(args.tags || [])])];
          const newProjects = [...new Set([...existingProjects, ...(args.projects || [])])];
          await env.DB.prepare(`UPDATE notes SET tags=?,projects=?,updated_at=? WHERE id=?`).bind(JSON.stringify(newTags),JSON.stringify(newProjects),now(),args.note_id).run();
          result = { note_id: args.note_id, tags: newTags, projects: newProjects }; break;
        }
        case 'note_export_markdown': {
          await initDB(env);
          const note = await env.DB.prepare(`SELECT * FROM notes WHERE id=?`).bind(args.note_id).first();
          if (!note) throw new Error(`Note not found: ${args.note_id}`);
          const tags = note.tags ? JSON.parse(note.tags) : [];
          const projects = note.projects ? JSON.parse(note.projects) : [];
          const md = [`# ${note.title}`,``,`**Recorded:** ${note.recorded_at || note.created_at}`,note.duration_seconds ? `**Duration:** ${note.duration_seconds}s` : null,tags.length ? `**Tags:** ${tags.join(', ')}` : null,projects.length ? `**Projects:** ${projects.join(', ')}` : null,`**Source:** ${note.source}`,``,`## Transcript`,``,note.transcript || '_No transcript_',note.summary ? `\n## Summary\n\n${note.summary}` : null].filter(l=>l!==null).join('\n');
          result = { note_id: args.note_id, markdown: md }; break;
        }
        default: return rpcErr(id, -32601, `Unknown tool: ${name}`);
      }
      return ok(id, result);
    } catch (e) { return rpcErr(id, -32603, `Tool error: ${e.message}`); }
  }
  return rpcErr(id, -32601, `Method not found: ${method}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), p = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (p === '/health') return J({ status: 'ok', worker: WORKER, version: VERSION, db: !!env.DB });
    if (p === '/mcp' && request.method === 'POST') return handleMCP(request, env);
    if (p === '/api/notes/ingest' && request.method === 'POST') {
      let body; try { body = await request.json(); } catch { return J({ ok: false, error: 'Invalid JSON' }, 400); }
      try { return J({ ok: true, ...(await ingestNote(env, body)) }); } catch (e) { return J({ ok: false, error: e.message }, 400); }
    }
    if (p === '/api/notes' && request.method === 'GET') {
      try { await initDB(env); const rows = await env.DB.prepare(`SELECT id,title,created_at FROM notes ORDER BY created_at DESC LIMIT 20`).all(); return J({ notes: rows.results || [] }); } catch (e) { return J({ error: e.message }, 500); }
    }
    return new Response(`tool-notes v${VERSION} — POST /mcp | POST /api/notes/ingest | GET /api/notes`, { status: 404 });
  },
};
