import React, { useMemo, useState } from "react";
import { FileDown, FileCog } from "lucide-react";
import {
  DEG_OPTIONS,
  MODES,
  buildCsv,
  downloadCsv,
  parseValues,
  requiredCounts,
} from "../utils/csvGenerator.js";

const BEAM_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1); // 1..60

export default function CanFileConfiguration() {
  const [mode, setMode] = useState("");
  const [degree, setDegree] = useState("");
  const [beamCount, setBeamCount] = useState(1);
  const [txRaw, setTxRaw] = useState("");
  const [rxRaw, setRxRaw] = useState("");
  const [banner, setBanner] = useState(null); // { type: "error"|"success", text }

  const txValues = useMemo(() => parseValues(txRaw), [txRaw]);
  const rxValues = useMemo(() => parseValues(rxRaw), [rxRaw]);
  const needs = requiredCounts(mode);

  const handleGenerate = () => {
    if (!mode || !degree) {
      setBanner({ type: "error", text: "Please select both Mode and Degree." });
      return;
    }
    if (needs.tx && txValues.length !== 16) {
      setBanner({ type: "error", text: `${mode} mode requires exactly 16 TX Phase values (got ${txValues.length}).` });
      return;
    }
    if (needs.rx && rxValues.length !== 16) {
      setBanner({ type: "error", text: `${mode} mode requires exactly 16 RX Phase values (got ${rxValues.length}).` });
      return;
    }

    const filename = `${mode}_${degree}.csv`;
    const csvText = buildCsv(mode, degree, txValues, rxValues, beamCount);
    downloadCsv(filename, csvText);
    setBanner({
      type: "success",
      text: `"${filename}" generated with ${beamCount} beam column${beamCount > 1 ? "s" : ""} and downloaded.`,
    });
  };

  return (
    <div className="grid-two-col">
      <div className="col">
        <section className="card">
          <h2 className="card-title">
            <FileCog size={18} /> TX/RX CSV Generator
          </h2>

          {banner && (
            <div className={`inline-banner ${banner.type}`}>{banner.text}</div>
          )}

          <div className="field-inline">
            <div className="field-inline-item">
              <label>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="" disabled>Select mode</option>
                {MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field-inline-item">
              <label>Degree</label>
              <select value={degree} onChange={(e) => setDegree(e.target.value)}>
                <option value="" disabled>Select degree</option>
                {DEG_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-inline">
            <div className="field-inline-item">
              <label>Beam Columns (1&ndash;60)</label>
              <select value={beamCount} onChange={(e) => setBeamCount(Number(e.target.value))}>
                {BEAM_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n === 1 ? "1 (single beam)" : `1 – ${n}`}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="muted" style={{ marginTop: "-0.4rem", marginBottom: "0.9rem" }}>
            Every extra beam column is copied horizontally from the same TX/RX
            values you paste below (column B repeated into C, D, &hellip;) — a
            ready template to fine-tune per beam afterward.
          </p>

          <div className="button-row">
            <button className="btn btn-primary" onClick={handleGenerate}>
              <FileDown size={16} /> Generate CSV
            </button>
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card">
          <h2 className="card-title">Phase Values</h2>
          <div className="phase-grid">
            <div className="phase-column">
              <div className="field-row">
                <label>TX Phase {needs.tx && <span className="required-mark">required</span>}</label>
                <span className={`count-badge ${txValues.length === 16 ? "ok" : ""}`}>
                  {txValues.length}/16
                </span>
              </div>
              <textarea
                className="phase-textarea"
                rows={16}
                value={txRaw}
                onChange={(e) => setTxRaw(e.target.value)}
                placeholder={"Paste 16 TX phase values\none per line"}
              />
            </div>
            <div className="phase-column">
              <div className="field-row">
                <label>RX Phase {needs.rx && <span className="required-mark">required</span>}</label>
                <span className={`count-badge ${rxValues.length === 16 ? "ok" : ""}`}>
                  {rxValues.length}/16
                </span>
              </div>
              <textarea
                className="phase-textarea"
                rows={16}
                value={rxRaw}
                onChange={(e) => setRxRaw(e.target.value)}
                placeholder={"Paste 16 RX phase values\none per line"}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
