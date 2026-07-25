import React, { useState } from "react";
import { Radio } from "lucide-react";
import StatusIndicator from "./components/StatusIndicator.jsx";
import Tabs from "./components/Tabs.jsx";
import CanOperations from "./components/CanOperations.jsx";
import CanFileConfiguration from "./components/CanFileConfiguration.jsx";
import { useCanSocket } from "./hooks/useCanSocket.js";

const TABS = [
  { id: "operations", label: "CAN Operations" },
  { id: "file-config", label: "CAN File Configuration" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("operations");
  const { connectionStatus, log, socketState } = useCanSocket();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-logo">
            <Radio size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h1>CAN Bus Control Center</h1>
            <p>client.cpp bridge &middot; live telemetry &amp; switching</p>
          </div>
        </div>
        <StatusIndicator connectionStatus={connectionStatus} socketState={socketState} />
      </header>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <main className="app-main">
        {/* Both tabs stay mounted so switching tabs never resets switch
            positions, form inputs, or command/log history — only hidden
            via CSS, not unmounted. */}
        <div hidden={activeTab !== "operations"}>
          <CanOperations connectionStatus={connectionStatus} log={log} />
        </div>
        <div hidden={activeTab !== "file-config"}>
          <CanFileConfiguration />
        </div>
      </main>
    </div>
  );
}
