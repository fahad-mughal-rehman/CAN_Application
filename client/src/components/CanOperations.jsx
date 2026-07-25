import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, StopCircle, RotateCcw, RefreshCw, Save, Send } from "lucide-react";
import StatusSquare from "./StatusSquare.jsx";
import { sendCommand, saveModeBeam } from "../api/canApi.js";
import {
  convertRawTempToCelsius,
  convertTemp,
  parseStatusLine,
} from "../utils/canDecode.js";

const subunitConfig = [
  { id: 1, name: "CAN Bus Power" },
  { id: 2, name: "CAN1 Bus Open Channel" },
  { id: 3, name: "CAN0 Bus Open Channel" },
  { id: 4, name: "Main Relay" },
  { id: 5, name: "TRM 13" },
  { id: 6, name: "TRM 24" },
];

const ON_COMMANDS = { 1: "0x1A", 2: "0x1B", 3: "0x1F", 4: "0x1C", 5: "0x1D", 6: "0x1E" };
const OFF_COMMANDS = { 1: "0x0A", 2: "0x0B", 3: "0x0F", 4: "0x0C", 5: "0x0D", 6: "0x0E" };

const trmOptions = Array.from({ length: 60 }, (_, i) => i + 1); // TRM-CONFIG-1 .. TRM-CONFIG-60
const tableMap = Object.fromEntries(trmOptions.map((n) => [n, `C${n}`]));

export default function CanOperations({ connectionStatus, log }) {
  const [subunits, setSubunits] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  const [tableValue, setTableValue] = useState("0");
  const [pulseCount, setPulseCount] = useState("");
  const [beamValue, setBeamValue] = useState("");
  const [repeatValue, setRepeatValue] = useState("0");
  const [commandResponses, setCommandResponses] = useState([]);
  const [decodedStatus, setDecodedStatus] = useState(null);
  const [lastCanLogAt, setLastCanLogAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const processedCountRef = useRef(0);

  // Live status decoding from the CAN_LOG stream tailed off client.cpp's
  // can_log_status.txt (pushed to us over the WebSocket bridge). client.cpp
  // tails that file independently every ~200ms, so there is nothing for us
  // to poll for on the command channel — we just consume what arrives.
  // Incoming lines land in batches (see useCanSocket), so we walk every
  // entry added since the last render rather than just the newest one, or a
  // status field could get silently skipped when several lines batch together.
  useEffect(() => {
    if (log.length <= processedCountRef.current) {
      processedCountRef.current = log.length;
      return;
    }
    const newEntries = log.slice(processedCountRef.current);
    processedCountRef.current = log.length;

    let merged = null;
    for (const entry of newEntries) {
      if (entry.type !== "can_log") continue;
      const parsed = parseStatusLine(entry.raw);
      if (parsed) merged = { ...merged, ...parsed };
    }
    if (newEntries.some((e) => e.type === "can_log")) setLastCanLogAt(Date.now());
    if (merged) setDecodedStatus((prev) => ({ ...prev, ...merged }));
  }, [log]);

  // Local-only ticker (no network calls) so the "live" badge can reflect
  // whether CAN_LOG data is still arriving recently.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, []);

  const statusPolling = subunits[1] === 1 && now - lastCanLogAt < 1000;

  const runCommand = async (command) => {
    try {
      const data = await sendCommand(command);
      setCommandResponses((prev) => [
        ...prev,
        {
          command,
          response: data.response || data.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return data;
    } catch (err) {
      setCommandResponses((prev) => [
        ...prev,
        { command, response: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
      return null;
    }
  };

  const handleSubunitToggle = async (id) => {
    const turningOn = subunits[id] !== 1;
    setSubunits((prev) => ({ ...prev, [id]: turningOn ? 1 : 0 }));
    await runCommand(turningOn ? ON_COMMANDS[id] : OFF_COMMANDS[id]);
  };

  const handleTrmSelect = (value) => {
    setTableValue(value);
    if (value !== "0") setBeamValue(value);
  };

  const handleSaveConfiguration = async () => {
    const tableLetter = tableMap[Number(tableValue)] || "C1";
    // These four writes touch independent files on the client.cpp side
    // (pulse/beams/config/repeat), so send them together instead of
    // waiting on each ack in turn — ~4x faster for what is otherwise a
    // single logical "save" action from the user's point of view.
    await Promise.all([
      runCommand(`P${pulseCount}`),
      runCommand(`B${beamValue}`),
      runCommand(tableLetter),
      runCommand(`R${repeatValue}`),
    ]);
    try {
      await saveModeBeam(pulseCount, beamValue);
    } catch (err) {
      console.error("save-mode-beam failed:", err);
    }
  };

  const temperatureC = decodedStatus?.temperature !== undefined
    ? convertRawTempToCelsius(decodedStatus.temperature)
    : null;
  const vtm13V = decodedStatus?.vtm13 !== undefined ? (decodedStatus.vtm13 * 71.68) / 4096 : null;
  const vtm24V = decodedStatus?.vtm24 !== undefined ? (decodedStatus.vtm24 * 71.68) / 4096 : null;
  const vtm48V = decodedStatus?.vtm48 !== undefined ? (decodedStatus.vtm48 * 115.6517134096) / 4096 : null;
  const currentA = decodedStatus?.current1 !== undefined ? (decodedStatus.current1 * 23.0865) / 4096 : null;

  const statusRows = useMemo(() => {
    if (subunits[1] !== 1) return null;
    return [
      { label: "Status Core", value: decodedStatus?.statusCore || "N/A" },
      {
        label: "Temperature",
        value: temperatureC !== null ? `${temperatureC.toFixed(2)}°C` : "N/A",
        square: temperatureC === null ? { color: "gray", fill: "gray" }
          : temperatureC > 60 ? { color: "red", fill: "red" }
          : temperatureC > 0 ? { color: "green", fill: "green" }
          : { color: "black", fill: "black" },
      },
      {
        label: "VTM 13",
        value: vtm13V !== null ? `${vtm13V.toFixed(2)} V` : "N/A",
        square: decodedStatus?.vtm13 === 0 ? { color: "black", fill: "black" }
          : vtm13V > 0 && vtm13V <= 31 ? { color: "green", fill: "green" }
          : decodedStatus?.vtm13 ? { color: "red", fill: "red" }
          : { color: "gray", fill: "gray" },
      },
      {
        label: "VTM 24",
        value: vtm24V !== null ? vtm24V.toFixed(2) : "N/A",
        square: decodedStatus?.vtm24 === 0 ? { color: "black", fill: "black" }
          : vtm24V > 0 && vtm24V <= 31 ? { color: "green", fill: "green" }
          : decodedStatus?.vtm24 ? { color: "black", fill: "black" }
          : { color: "gray", fill: "gray" },
      },
      {
        label: "VTM 48",
        value: vtm48V !== null ? `${vtm48V.toFixed(2)} V` : "N/A",
        square: decodedStatus?.vtm48 === 0 ? { color: "black", fill: "black" }
          : vtm48V > 0 && vtm48V <= 50 ? { color: "green", fill: "green" }
          : vtm48V > 51 ? { color: "black", fill: "red" }
          : { color: "gray", fill: "gray" },
      },
      {
        label: "Current",
        value: currentA !== null ? currentA.toFixed(2) : "N/A",
        square: decodedStatus?.current1 === 0 ? { color: "red", fill: "red" }
          : decodedStatus?.current1 >= 0 && decodedStatus?.current1 <= 255 ? { color: "green", fill: "green" }
          : { color: "gray", fill: "gray" },
      },
      { label: "Temperature TH1", value: decodedStatus?.th1 !== undefined ? `${convertTemp(decodedStatus.th1) - 5} °C` : "N/A" },
      { label: "Temperature TH2", value: decodedStatus?.th2 !== undefined ? `${convertTemp(decodedStatus.th2) - 5} °C` : "N/A" },
      { label: "Temperature TH3", value: decodedStatus?.th3 !== undefined ? `${convertTemp(decodedStatus.th3) - 5} °C` : "N/A" },
      { label: "Temperature TH4", value: decodedStatus?.th4 !== undefined ? `${convertTemp(decodedStatus.th4) - 5} °C` : "N/A" },
    ];
  }, [subunits, decodedStatus, temperatureC, vtm13V, vtm24V, vtm48V, currentA]);

  return (
    <div className="operations-wrap">
      {!connectionStatus?.connected && (
        <div className="banner-warning">
          client.cpp is not connected to the bridge yet — commands will be queued and will
          report a timeout until it connects on port 5001.
        </div>
      )}
      <div className="grid-two-col">
      <div className="col">
        {/* Sub-unit switching */}
        <section className="card">
          <h2 className="card-title">CANBUS Switching</h2>
          <div className="subunit-list">
            {subunitConfig.map(({ id, name }) => (
              <div className="subunit-row" key={id}>
                <span>{name}</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subunits[id] === 1}
                    onChange={() => handleSubunitToggle(id)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* TRM Configuration */}
        <section className="card">
          <h2 className="card-title">TRM Configuration</h2>
          <div className="field-row">
            <label>Select TRM Configuration</label>
            <select value={tableValue} onChange={(e) => handleTrmSelect(e.target.value)}>
              <option value="0" disabled>Choose Configuration</option>
              {trmOptions.map((n) => (
                <option key={n} value={n}>TRM-CONFIG-{n}</option>
              ))}
            </select>
          </div>

          <div className="field-inline">
            <div className="field-inline-item">
              <label>Pulse Count</label>
              <input
                value={pulseCount}
                onChange={(e) => setPulseCount(e.target.value)}
                placeholder="Enter pulse"
              />
            </div>
            <div className="field-inline-item">
              <label>Beam</label>
              <input
                value={beamValue}
                onChange={(e) => setBeamValue(e.target.value)}
                placeholder="Enter beam"
              />
            </div>
          </div>

          <div className="field-row">
            <label>TRM Repetition</label>
            <select value={repeatValue} onChange={(e) => setRepeatValue(e.target.value)}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          <div className="button-row">
            <button className="btn btn-primary" onClick={handleSaveConfiguration}>
              <Save size={16} /> Save Configuration
            </button>
            <button className="btn" onClick={() => runCommand("0x90")}>
              <Send size={16} /> Send Configuration
            </button>
          </div>
        </section>

        {/* Operations */}
        <section className="card">
          <h2 className="card-title">Canbus Operation</h2>
          <div className="button-grid">
            <button className="btn btn-success" onClick={() => runCommand("0x91")}>
              <PlayCircle size={16} /> Start Beam Forming
            </button>
            <button className="btn btn-warning" onClick={() => runCommand("0x92")}>
              <StopCircle size={16} /> Stop Beam Forming
            </button>
            <button className="btn btn-danger" onClick={() => runCommand("0x93")}>
              <RotateCcw size={16} /> Reset PCE
            </button>
            <button className="btn btn-danger" onClick={() => runCommand("0x95")}>
              <RefreshCw size={16} /> Reset CAN Module
            </button>
          </div>
        </section>
      </div>

      <div className="col">
        {/* Status */}
        <section className="card">
          <div className="card-title-row">
            <h2 className="card-title">Current Status</h2>
            {subunits[1] === 1 && (
              <span className={`poll-badge ${statusPolling ? "live" : ""}`}>
                {statusPolling ? "live · polling" : "idle"}
              </span>
            )}
          </div>
          {statusRows ? (
            <div className="status-grid">
              {statusRows.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="status-label">{row.label}</div>
                  <div className="status-value">{row.value}</div>
                  <div className="status-square">
                    {row.square && <StatusSquare {...row.square} />}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <p className="muted">CAN Power is OFF</p>
          )}
        </section>

        {/* Command history */}
        <section className="card">
          <h2 className="card-title">Command History</h2>
          <div className="history-list">
            {commandResponses.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Command</th>
                    <th>Response</th>
                  </tr>
                </thead>
                <tbody>
                  {commandResponses.slice().reverse().slice(0, 50).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.timestamp}</td>
                      <td><code>{item.command}</code></td>
                      <td>{item.response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No commands sent yet</p>
            )}
          </div>
        </section>

        {/* Live CAN log */}
        <section className="card">
          <h2 className="card-title">Live CAN Log</h2>
          <div className="log-panel">
            {log.length === 0 && <p className="muted">Waiting for data from client.cpp&hellip;</p>}
            {log.slice().reverse().slice(0, 60).map((entry, idx) => (
              <div key={idx} className={`log-line log-${entry.type}`}>
                <span className="log-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-text">
                  {entry.type === "ack" ? `ACK: ${entry.command}` : entry.raw}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
