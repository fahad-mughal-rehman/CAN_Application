const API_BASE = "/api";

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const sendCommand = (command, value = null) => {
  const payload = { command };
  if (value !== null) payload.value = value;
  return postJson("/send-command", payload);
};

export const saveModeBeam = (mode, beam) => postJson("/save-mode-beam", { mode, beam });

export const fetchStatus = () => fetch(`${API_BASE}/status`).then((r) => r.json());

export const fetchCanLog = (limit = 100) =>
  fetch(`${API_BASE}/can-log?limit=${limit}`).then((r) => r.json());
