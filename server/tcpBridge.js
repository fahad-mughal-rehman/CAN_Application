const net = require("net");
const EventEmitter = require("events");

const TCP_PORT = 5001; // must match SERVER_PORT in client.cpp
// Real acks on localhost land in single-digit ms once NODELAY is set; this
// timeout only matters for the "client.cpp isn't responding" case, so keep
// it short enough that a broken command doesn't stall a button click for
// a full 2 seconds. Loopback jitter is nowhere near this even under load.
const ACK_TIMEOUT_MS = 600;
const LOG_BUFFER_SIZE = 500;

// Bridges the raw line-oriented TCP protocol spoken by client.cpp to the
// rest of the app. client.cpp connects OUT to us (we are the server it
// dials into), sends "Command executed: X" acks and "CAN_LOG:<line>" tails.
class TcpBridge extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.clientAddress = null;
    this.connectedAt = null;
    this.pending = new Map(); // command -> [{resolve, timer}]
    this.logBuffer = [];
    this.commandHistory = [];

    this.server = net.createServer((socket) => this._handleConnection(socket));
    this.server.on("error", (err) => {
      console.error("[tcp] server error:", err.message);
    });
  }

  listen() {
    this.server.listen(TCP_PORT, () => {
      console.log(`[tcp] listening for client.cpp on port ${TCP_PORT}`);
    });
  }

  isConnected() {
    return !!this.socket;
  }

  getStatus() {
    return {
      connected: this.isConnected(),
      clientAddress: this.clientAddress,
      connectedAt: this.connectedAt,
    };
  }

  getRecentLog(limit = 100) {
    return this.logBuffer.slice(-limit);
  }

  _handleConnection(socket) {
    if (this.socket) {
      // Only one CAN client is expected; replace the stale connection.
      try {
        this.socket.destroy();
      } catch (_) {}
    }

    socket.setNoDelay(true); // disable Nagle: this is a small request/response
    // protocol, not a bulk stream, so buffering tiny writes to wait for more
    // data (or the peer's delayed ACK) just adds latency to every command.

    this.socket = socket;
    this.clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    this.connectedAt = new Date().toISOString();
    console.log(`[tcp] client.cpp connected from ${this.clientAddress}`);
    this.emit("status", this.getStatus());

    let pending = "";
    socket.on("data", (chunk) => {
      pending += chunk.toString("utf8");
      let idx;
      while ((idx = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, idx).replace(/\r$/, "");
        pending = pending.slice(idx + 1);
        if (line.length) this._handleLine(line);
      }
    });

    socket.on("close", () => {
      console.log("[tcp] client.cpp disconnected");
      if (this.socket === socket) {
        this.socket = null;
        this.clientAddress = null;
        this.connectedAt = null;
      }
      this.emit("status", this.getStatus());
    });

    socket.on("error", (err) => {
      console.error("[tcp] socket error:", err.message);
    });
  }

  _handleLine(line) {
    const timestamp = new Date().toISOString();

    if (line.startsWith("CAN_LOG:")) {
      const raw = line.slice("CAN_LOG:".length);
      const entry = { type: "can_log", raw, timestamp };
      this._pushLog(entry);
      this.emit("line", entry);
      return;
    }

    if (line.startsWith("Command executed: ")) {
      const command = line.slice("Command executed: ".length);
      const entry = { type: "ack", command, raw: line, timestamp };
      this._pushLog(entry);
      this._resolvePending(command, line);
      this.emit("line", entry);
      return;
    }

    const entry = { type: "info", raw: line, timestamp };
    this._pushLog(entry);
    this.emit("line", entry);
  }

  _pushLog(entry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > LOG_BUFFER_SIZE) {
      this.logBuffer.shift();
    }
  }

  _resolvePending(command, responseLine) {
    const waiters = this.pending.get(command);
    if (!waiters || !waiters.length) return;
    const { resolve, timer } = waiters.shift();
    clearTimeout(timer);
    resolve(responseLine);
    if (!waiters.length) this.pending.delete(command);
  }

  // Sends a raw command line to client.cpp and resolves with its
  // acknowledgement text, or rejects on timeout / no connection.
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("CAN client (client.cpp) is not connected"));
        return;
      }

      const timer = setTimeout(() => {
        const waiters = this.pending.get(command);
        if (waiters) {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx !== -1) waiters.splice(idx, 1);
          if (!waiters.length) this.pending.delete(command);
        }
        resolve(null); // no ack within window; caller treats as "sent, no reply"
      }, ACK_TIMEOUT_MS);

      if (!this.pending.has(command)) this.pending.set(command, []);
      this.pending.get(command).push({ resolve, timer });

      this.commandHistory.push({ command, timestamp: new Date().toISOString() });
      if (this.commandHistory.length > LOG_BUFFER_SIZE) this.commandHistory.shift();

      this.socket.write(command + "\n", (err) => {
        if (err) reject(err);
      });
    });
  }
}

module.exports = { TcpBridge, TCP_PORT };
