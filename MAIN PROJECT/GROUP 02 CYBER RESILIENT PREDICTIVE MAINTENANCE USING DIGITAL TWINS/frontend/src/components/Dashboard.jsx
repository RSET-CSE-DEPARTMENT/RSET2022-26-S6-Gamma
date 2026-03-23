import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import ControlPanel from "./ControlPanel";
import ResultsViewer from "./ResultsViewer";
import ActiveDefenseView from "./ActiveDefenseView";
import DualModelView from "./DualModelView";
import MultiMotorView from "./MultiMotorView";
import VerificationView from "./VerificationView";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8002";

const DEFAULT_PARAMS = {
  Kt: 0.1,
  J: 0.01,
  b: 0.1,
  load_torque: 0.5,
  voltage: 12.0,
  dt: 0.02,
  duration: 10.0,
  noise_level: 0.05,
  fault_type: "None",
  fault_severity: 0.5,
  fault_start_time: 5.0,
  attack_type: "None",
  attack_magnitude: 2.0,
  attack_start_time: 7.0,
};

const MODES = [
  {
    id: "simulate",
    label: "Single Motor",
    icon: "⚙️",
    desc: "Physics simulation + SHAP explainability",
  },
  {
    id: "active-defense",
    label: "Active Defense",
    icon: "🛡️",
    desc: "Kalman gatekeeper isolates sensor during attacks",
  },
  {
    id: "dual-model",
    label: "Dual Model",
    icon: "🤖",
    desc: "XGBoost detection + LSTM health index together",
  },
  {
    id: "multi-motor",
    label: "Multi-Motor",
    icon: "⚡",
    desc: "Motor A (attacked) vs Motor B (healthy observer)",
  },
  {
    id: "verify",
    label: "Verification",
    icon: "✅",
    desc: "5 automated pass/fail scenarios",
  },
];

export default function Dashboard() {
  const [mode, setMode]       = useState("simulate");
  const [params, setParams]   = useState(DEFAULT_PARAMS);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/simulate`, params);
      setResults(data);
      toast.success("Simulation complete");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail ?? "Backend error — is it running?");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!results) return;
    const keys = Object.keys(results).filter((k) => Array.isArray(results[k]));
    const rows = results.time.map((_, i) =>
      Object.fromEntries(keys.map((k) => [k, results[k][i]]))
    );
    if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "simulation_data.json"; a.click();
    } else {
      const csv = keys.join(",") + "\n" + rows.map((r) => keys.map((k) => r[k]).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "simulation_data.csv"; a.click();
    }
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const handleModeChange = (m) => {
    setMode(m);
    if (m !== "simulate") setResults(null);
  };

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className={`h-screen flex flex-col bg-slate-950 text-white${lightMode ? " light-mode" : ""}`}>

      {/* Top bar */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900">
        {/* Title row */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-800">
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Cyber-Resilient Digital Twin — DC Motor Pump
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Physics Simulation · Kalman Filter · XGBoost (5-class) · LSTM RUL · SHAP Explainability
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeMode && (
              <div className="hidden md:flex flex-col items-end gap-0.5">
                <span className="text-xs text-slate-400 font-medium">{activeMode.icon} {activeMode.label}</span>
                <span className="text-xs text-slate-600">{activeMode.desc}</span>
              </div>
            )}
            <button
              onClick={() => setLightMode((v) => !v)}
              title="Toggle light/dark mode"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors text-sm"
            >
              {lightMode ? "🌙" : "☀️"}
            </button>
          </div>
        </div>

        {/* Architecture pipeline strip */}
        <div className="flex items-center gap-0 px-6 py-2 border-b border-slate-800 bg-slate-950 overflow-x-auto">
          {[
            { label: "DC Motor Sim",    sub: "Physics + noise injection",   color: "text-slate-300" },
            { label: "Kalman Filter",   sub: "State estimation",             color: "text-blue-400"  },
            { label: "XGBoost",         sub: "5-class attack detector",      color: "text-orange-400"},
            { label: "LSTM",            sub: "Health index (RUL)",           color: "text-purple-400"},
            { label: "SHAP",            sub: "Feature explainability",       color: "text-green-400" },
          ].map((node, i) => (
            <div key={node.label} className="flex items-center shrink-0">
              <div className="text-center px-3">
                <p className={`text-xs font-semibold ${node.color}`}>{node.label}</p>
                <p className="text-xs text-slate-600">{node.sub}</p>
              </div>
              {i < 4 && <span className="text-slate-700 text-sm mx-1">→</span>}
            </div>
          ))}
          <div className="ml-auto pl-4 border-l border-slate-800 shrink-0">
            <p className="text-xs text-slate-600 whitespace-nowrap">Detects: <span className="text-slate-400">Normal · Sensor Spoofing · Packet Dropout · Freezing Sensor · Friction · Bearing</span></p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2
                ${mode === m.id
                  ? "text-blue-400 border-blue-400 bg-slate-950"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"}`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {mode === "simulate" ? (
          <>
            {/* Sidebar — only in single motor mode */}
            <div className="w-72 shrink-0">
              <ControlPanel
                params={params}
                onChange={setParams}
                onRun={handleRun}
                loading={loading}
              />
            </div>
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ResultsViewer results={results} params={params} onExport={handleExport} />
            </main>
          </>
        ) : (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {mode === "active-defense" && <ActiveDefenseView />}
            {mode === "dual-model"     && <DualModelView />}
            {mode === "multi-motor"    && <MultiMotorView />}
            {mode === "verify"         && <VerificationView />}
          </main>
        )}
      </div>
    </div>
  );
}
