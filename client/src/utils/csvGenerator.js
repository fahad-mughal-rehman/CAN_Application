// Ported 1:1 from the original TX/RX CSV Generator (Tkinter) script so the
// generated file is byte-for-byte structured the same way.

export const TRM_ROWS = [
  "TRM1_CH1 & CH2",
  "TRM1_CH3 & CH4",
  "TRM2_CH1 & CH2",
  "TRM2_CH3 & CH4",
  "TRM3_CH1 & CH2",
  "TRM3_CH3 & CH4",
  "TRM4_CH1 & CH2",
  "TRM4_CH3 & CH4",
];

export const D_ROWS = [
  "TR1CH1D3", "TR1CH1D2", "TR1CH1D1", "TR1CH1D0",
  "TR1CH2D3", "TR1CH2D2", "TR1CH2D1", "TR1CH2D0",
  "TR1CH3D3", "TR1CH3D2", "TR1CH3D1", "TR1CH3D0",
  "TR1CH4D3", "TR1CH4D2", "TR1CH4D1", "TR1CH4D0",
  "TR2CH1D3", "TR2CH1D2", "TR2CH1D1", "TR2CH1D0",
  "TR2CH2D3", "TR2CH2D2", "TR2CH2D1", "TR2CH2D0",
  "TR2CH3D3", "TR2CH3D2", "TR2CH3D1", "TR2CH3D0",
  "TR2CH4D3", "TR2CH4D2", "TR2CH4D1", "TR2CH4D0",
  "TR3CH1D3", "TR3CH1D2", "TR3CH1D1", "TR3CH1D0",
  "TR3CH2D3", "TR3CH2D2", "TR3CH2D1", "TR3CH2D0",
  "TR3CH3D3", "TR3CH3D2", "TR3CH3D1", "TR3CH3D0",
  "TR3CH4D3", "TR3CH4D2", "TR3CH4D1", "TR3CH4D0",
  "TR4CH1D3", "TR4CH1D2", "TR4CH1D1", "TR4CH1D0",
  "TR4CH2D3", "TR4CH2D2", "TR4CH2D1", "TR4CH2D0",
  "TR4CH3D3", "TR4CH3D2", "TR4CH3D1", "TR4CH3D0",
  "TR4CH4D3", "TR4CH4D2", "TR4CH4D1", "TR4CH4D0",
];

export const DEG_OPTIONS = [
  "+5deg", "+4deg", "+3deg", "+2deg", "+1deg",
  "Boresight",
  "-1deg", "-2deg", "-3deg", "-4deg", "-5deg",
];

export const MODES = ["TX", "RX", "TXRX"];

const TRM_VAL = { TX: 85, RX: 51, TXRX: 119 };

export function requiredCounts(mode) {
  return {
    tx: mode === "TX" || mode === "TXRX" ? 16 : 0,
    rx: mode === "RX" || mode === "TXRX" ? 16 : 0,
  };
}

// Mirrors generate_csv() from the Python tool, returning CSV text instead
// of writing to disk directly (this runs in a browser, not on the filesystem).
// beamCount repeats each value across that many columns (B, C, D, ...) so a
// single pasted set of TX/RX values seeds a template covering multiple beams.
export function buildCsv(mode, degree, txValues, rxValues, beamCount = 1) {
  const trmVal = TRM_VAL[mode];
  const rows = [];
  const repeat = (label, value) => [label, ...Array(beamCount).fill(value)];

  for (const trm of TRM_ROWS) rows.push(repeat(trm, trmVal));
  for (let i = 0; i < 9; i++) rows.push([]);

  let txIndex = 0;
  let rxIndex = 0;
  for (const drow of D_ROWS) {
    const dBit = Number(drow[drow.length - 1]);
    let val;
    if (dBit === 0) val = 0; // TX Attenuation
    else if (dBit === 1) val = 0; // RX Attenuation
    else if (dBit === 2) val = txIndex < txValues.length ? txValues[txIndex++] : 0; // TX Phase
    else val = rxIndex < rxValues.length ? rxValues[rxIndex++] : 0; // RX Phase
    rows.push(repeat(drow, val));
  }

  return rows.map((row) => row.join(",")).join("\r\n") + "\r\n";
}

export function parseValues(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => Number(line))
    .filter((n) => Number.isFinite(n));
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
