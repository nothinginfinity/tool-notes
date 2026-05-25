// tool-notes Worker stub
// Full implementation target:
// - POST /api/notes/ingest
// - POST /mcp
// - D1 storage
// - Vectorize embedding/search
// - optional R2 audio storage

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        worker: "tool-notes",
        version: "0.0.1",
        purpose: "MCP-native voice memory"
      });
    }

    if (url.pathname === "/") {
      return new Response("Tool Notes API", {
        headers: { "content-type": "text/plain" }
      });
    }

    return new Response("not found", { status: 404 });
  }
};
