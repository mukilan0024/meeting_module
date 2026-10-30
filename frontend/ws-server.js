/**
 * Yjs WebSocket Collaboration Server
 * Runs standalone on port 1234 (separate from the Next.js dev server).
 *
 * Start with:  npm run ws-server
 * Or:          node ws-server.js
 *
 * Each meeting's live notes room is identified by:
 *   meeting-<uuid>-live_notes   (live collaborative notes)
 *   meeting-<uuid>-mom          (finalised MoM draft)
 *
 * This server keeps Yjs documents in-memory. For production persistence,
 * install y-leveldb or y-redis and pass a LeveldbPersistence instance
 * to the setupWSConnection call.
 */

const { createServer } = require("http");
const { setupWSConnection } = require("y-websocket/bin/utils");
const WebSocket = require("ws");

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 1234;
const HOST = process.env.WS_HOST ?? "0.0.0.0";

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", port: PORT }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log(`[WS] New connection from ${req.socket.remoteAddress} | path: ${req.url}`);
  setupWSConnection(ws, req);
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Yjs WebSocket Server running on ws://${HOST}:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
