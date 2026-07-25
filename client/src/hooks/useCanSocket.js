import { useEffect, useRef, useState } from "react";

const FLUSH_MS = 150; // coalesce bursts of CAN_LOG lines into one render
const MAX_LOG = 300;

// Live connection status + CAN_LOG tail, pushed from the Node bridge over
// the /ws WebSocket (fed by client.cpp's TCP stream on the backend).
export function useCanSocket() {
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });
  const [log, setLog] = useState([]);
  const [socketState, setSocketState] = useState("connecting"); // connecting | open | closed
  const queueRef = useRef([]);

  useEffect(() => {
    let ws;
    let retryTimer;

    // client.cpp can emit many CAN_LOG lines in a tight burst; applying each
    // one as its own setState would fire a React render per line and could
    // starve the main thread right when the user is clicking something. We
    // buffer incoming lines and flush them as a single state update instead.
    const flushTimer = setInterval(() => {
      if (!queueRef.current.length) return;
      const batch = queueRef.current;
      queueRef.current = [];
      setLog((prev) => [...prev, ...batch].slice(-MAX_LOG));
    }, FLUSH_MS);

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/ws`);

      ws.onopen = () => setSocketState("open");
      ws.onclose = () => {
        setSocketState("closed");
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "init") {
          setConnectionStatus(msg.status);
          setLog(msg.log || []);
        } else if (msg.type === "status") {
          setConnectionStatus(msg.status);
        } else if (msg.type === "line") {
          queueRef.current.push(msg.entry);
        }
      };
    };

    connect();
    return () => {
      clearInterval(flushTimer);
      clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return { connectionStatus, log, socketState };
}
