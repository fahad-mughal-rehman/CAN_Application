# CAN Bus Control Center

A dark-mode React + Node.js dashboard for operating and configuring a CAN bus
system that is driven by an existing native client, `client.cpp` (see
[`information/client.cpp`](information/client.cpp) — unmodified reference
copy). This replaces the old `Canbus.js` component from the previous large
React app with a focused, standalone application.

## Architecture

```
 Browser (React, Vite)  <--HTTP/WebSocket-->  Node bridge (Express + ws)  <--raw TCP-->  client.cpp
      port 5173 (dev)         port 5000              port 5001 (listener)      connects out to 127.0.0.1:5001
```

- **`server/`** — Node.js bridge process.
  - Runs a raw TCP server on **port 5001** that `client.cpp` connects into
    (it dials out to `127.0.0.1:5001` on startup — this is fixed in
    `client.cpp` and cannot be changed).
  - Parses `client.cpp`'s line protocol: `Command executed: X` acks and
    `CAN_LOG:<line>` tailed status lines.
  - Exposes an HTTP + WebSocket API on **port 5000** for the React app, and
    (in production) serves the built React app itself from the same port.
- **`client/`** — React (Vite) dashboard with two tabs:
  - **CAN Operations** — subunit power switches, TRM configuration/beam
    select, pulse/beam/repeat fields, beam-forming controls, live decoded
    status panel, command history, and a live CAN log stream.
  - **CAN File Configuration** — TX/RX phase CSV generator (mode, degree,
    beam-column count, TX/RX phase values) that downloads a CSV matching the
    original TRM configuration file format.
- **`information/`** — reference-only copies of the pre-existing, unchanged
  `client.cpp` and the original `Canbus.js` this project replaces.

Fonts (Inter, Rajdhani) are bundled locally under
`client/src/assets/fonts/` and loaded via local `@font-face` rules — no
CDN/network access is required at runtime, so the app works fully offline.

## Prerequisites

- Node.js 18+ and npm
- The compiled `client.cpp` executable (built separately, e.g. via Visual
  Studio) — not part of this repo

## Development

Two terminals:

```bash
# 1) backend bridge (TCP :5001 + HTTP/WS :5000)
cd server
npm install
npm start

# 2) React dev server with hot reload (http://localhost:5173)
cd client
npm install
npm run dev
```

Then start your compiled `client.cpp` executable — it will connect out to
`127.0.0.1:5001`. Once connected, the dashboard header flips to "Connected".

## Production / offline deployment

Ship a single process on one port — no dev server, no proxy, works with no
internet access:

```bash
cd client
npm install
npm run build          # produces client/dist

cd ../server
npm install
npm start               # serves the app + API on http://localhost:5000
```

Open `http://localhost:5000` in a browser on the target machine. Re-run
`npm run build` any time the client code changes, then restart the server.

## Ports

| Port | Used by | Purpose |
|------|---------|---------|
| 5001 | `server/` (TCP) | Listens for the `client.cpp` connection |
| 5000 | `server/` (HTTP/WS) | REST API, WebSocket live feed, and (in production) the built React app |
| 5173 | `client/` (dev only) | Vite dev server, proxies `/api` and `/ws` to port 5000 |

## Project structure

```
CAN_application/
├── client/                  React dashboard (Vite)
│   ├── src/
│   │   ├── components/      CanOperations, CanFileConfiguration, Tabs, StatusIndicator, ...
│   │   ├── hooks/           useCanSocket.js (WebSocket live feed)
│   │   ├── api/             canApi.js (REST calls to the backend)
│   │   ├── utils/           canDecode.js, csvGenerator.js
│   │   ├── styles/          theme.css, fonts.css
│   │   └── assets/fonts/    self-hosted Inter + Rajdhani .woff2 files
│   └── vite.config.js
├── server/                  Node bridge (Express + ws + raw TCP)
│   ├── server.js            HTTP/WebSocket API, static file serving
│   └── tcpBridge.js         TCP server + client.cpp line protocol parsing
└── information/             Reference-only: original client.cpp and Canbus.js
```

## Notes on the client.cpp protocol

- `client.cpp` is treated as fixed/unchangeable — the bridge conforms to its
  protocol, not the other way around.
- Commands are plain newline-terminated strings written to the TCP socket
  (e.g. `0x1A`, `P5`, `B12`, `C3`, `R0`); `client.cpp` echoes back
  `Command executed: <command>` when it recognizes one.
- Live status/telemetry arrives independently as `CAN_LOG:NO:xx LEN:n
  DATA:...` lines tailed from `can_log_status.txt` roughly every 200ms — the
  dashboard decodes these live over the WebSocket rather than polling.
