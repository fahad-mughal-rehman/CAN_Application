import React from "react";
import { Wifi, WifiOff, Plug, PlugZap } from "lucide-react";

export default function StatusIndicator({ connectionStatus, socketState }) {
  const canConnected = !!connectionStatus?.connected;
  const bridgeUp = socketState === "open";

  return (
    <div className="status-indicators">
      <div className={`status-pill ${bridgeUp ? "ok" : "down"}`}>
        {bridgeUp ? <Wifi size={15} /> : <WifiOff size={15} />}
        <span>Bridge {bridgeUp ? "Online" : "Offline"}</span>
      </div>
      <div className={`status-pill ${canConnected ? "ok" : "down"}`}>
        {canConnected ? <PlugZap size={15} /> : <Plug size={15} />}
        <span>
          client.cpp {canConnected ? "Connected" : "Disconnected"}
          {canConnected && connectionStatus.clientAddress
            ? ` (${connectionStatus.clientAddress})`
            : ""}
        </span>
      </div>
    </div>
  );
}
