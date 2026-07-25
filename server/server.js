const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const { TcpBridge } = require("./tcpBridge");

const HTTP_PORT = 5000; // matches the endpoints the React app expects

const app = express();
app.use(cors());
app.use(express.json());

// Serve the built React app (client/dist) directly, so a production/offline
// deployment is a single process on one port — no separate dev server or
// proxy required. Run `npm run build` in client/ to produce this folder.
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  console.log(`[http] serving built client from ${clientDist}`);
} else {
  console.log("[http] no client/dist found yet — run `npm run build` in client/ for production serving");
}

const bridge = new TcpBridge();
bridge.listen();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

bridge.on("status", (status) => broadcast({ type: "status", status }));
bridge.on("line", (entry) => broadcast({ type: "line", entry }));

wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({
      type: "init",
      status: bridge.getStatus(),
      log: bridge.getRecentLog(100),
    })
  );
});

// ---- REST API (same contract the React CAN dashboard talks to) ----

app.post("/api/send-command", async (req, res) => {
  const { command, value } = req.body || {};
  if (!command) {
    return res.status(400).json({ message: "Missing 'command'" });
  }

  const finalCommand = value !== undefined && value !== null && value !== ""
    ? `${command}${value}`
    : command;

  try {
    const ack = await bridge.sendCommand(finalCommand);
    res.json({
      response: ack || `Sent: ${finalCommand} (no acknowledgement received)`,
      command: finalCommand,
    });
  } catch (err) {
    res.status(503).json({ message: err.message });
  }
});

app.post("/api/save-mode-beam", (req, res) => {
  const { mode, beam } = req.body || {};
  console.log(`[api] save-mode-beam mode=${mode} beam=${beam}`);
  res.json({ message: "Mode & beam recorded", mode, beam });
});

app.get("/api/status", (req, res) => {
  res.json(bridge.getStatus());
});

app.get("/api/can-log", (req, res) => {
  const limit = Number(req.query.limit) || 100;
  res.json({ log: bridge.getRecentLog(limit) });
});

server.listen(HTTP_PORT, () => {
  console.log(`[http] API + WebSocket listening on port ${HTTP_PORT}`);
});
