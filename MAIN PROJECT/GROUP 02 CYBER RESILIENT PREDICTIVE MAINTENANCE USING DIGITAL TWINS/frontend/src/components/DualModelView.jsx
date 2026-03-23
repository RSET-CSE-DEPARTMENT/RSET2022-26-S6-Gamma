import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8002";

const ATTACK_OPTIONS = ["None", "Sensor Spoofing", "Freezing Sensor", "Packet Dropout"];
const FAULT_OPTIONS  = ["None", "Friction Buildup", "Bearing Fault"];

const LABEL_COLORS = {
  "Normal":           "#22c55e",
  "Mechanical Fault": "#f59e0b",
  "Sensor Spoofing":  "#ef4444",
  "Packet Dropout":   "#a855f7",
  "Freezing Sensor":  "#92400e",
};

const Panel = ({ title, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</h3>
    {children}
  </div>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-2 text-xs">
      <p className="text-slate-400 mb-1">t = {Number(label).toFixed(2)}s</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(3)}
        </p>
      ))}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-300">{label}</label>
    {children}
  </div>
);

const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Num = ({ value, onChange, step = 0.5, min }) => (
  <input type="number" value={value} step={step} min={min}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
);

export default function DualModelView() {
  const [params, setParams] = useState({
    attack_type: "Sensor Spoofing",
    attack_magnitude: 5.0,
    attack_start_time: 4.0,
    fault_type: "Friction Buildup",
    fault_severity: 0.5,
    fault_start_time: 1.0,
    duration: 8.0,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setParams((p) => ({ ...p, [key]: val }));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/dual-model`, params);
      setResults(data);
      toast.success("Dual model analysis complete");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Backend error");
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = results
    ? results.time.map((t, i) => ({
        t: +t.toFixed(3),
        actual:        results.actual[i],
        sensor:        results.sensor[i],
        attack_prob:   results.attack_prob[i],
        predicted_rul: results.predicted_rul[i],
        attack_label:  results.attack_label[i],
      }))
    : [];

  // Group confidence points by label for scatter coloring
  const scatterByLabel = {};
  chartData.forEach((d) => {
    if (!scatterByLabel[d.attack_label]) scatterByLabel[d.attack_label] = [];
    scatterByLabel[d.attack_label].push({ t: d.t, prob: d.attack_prob });
  });

  const anomalyStart = results
    ? results.time.find((_, i) => results.attack_label[i] !== "Normal")
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <Field label="Attack Type">
            <Sel value={params.attack_type} onChange={set("attack_type")} options={ATTACK_OPTIONS} />
          </Field>
          {params.attack_type !== "None" && (
            <>
              <Field label="Magnitude">
                <Num value={params.attack_magnitude} onChange={set("attack_magnitude")} step={1} min={0} />
              </Field>
              <Field label="Attack Start (s)">
                <Num value={params.attack_start_time} onChange={set("attack_start_time")} step={0.5} min={0} />
              </Field>
            </>
          )}
          <Field label="Fault Type">
            <Sel value={params.fault_type} onChange={set("fault_type")} options={FAULT_OPTIONS} />
          </Field>
          {params.fault_type !== "None" && (
            <Field label="Fault Start (s)">
              <Num value={params.fault_start_time} onChange={set("fault_start_time")} step={0.5} min={0} />
            </Field>
          )}
          <Field label="Duration (s)">
            <Num value={params.duration} onChange={set("duration")} step={1} min={2} />
          </Field>
          <button onClick={handleRun} disabled={loading}
            className="h-9 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded transition-colors">
            {loading ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {!results ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-orange-400 mb-1">XGBoost Attack Classifier</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Classifies each 50-step window into 5 categories using 9 physics-derived features.
                  Confidence shown as a scatter plot — points above 70 % trigger an alarm.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-400 mb-1">LSTM Health Index</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Predicts remaining useful life (0–100 %). During cyber-attack windows the health index
                  is <span className="text-blue-300">frozen</span> — sensor data is untrusted. A monotonicity guardrail prevents fake recovery.
                </p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Scatter dot colours</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { color: "text-green-400",  label: "Normal" },
                  { color: "text-red-400",    label: "Sensor Spoofing" },
                  { color: "text-purple-400", label: "Packet Dropout" },
                  { color: "text-yellow-600", label: "Freezing Sensor" },
                  { color: "text-orange-400", label: "Mechanical Fault" },
                ].map(({ color, label }) => (
                  <span key={label} className={`text-xs font-medium ${color}`}>{label}</span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600 text-center">Configure parameters above and click <strong className="text-slate-400">▶ Run</strong></p>
          </div>
        ) : (
          <>
            {/* Status summary */}
            {anomalyStart !== null && (
              <div className="flex gap-3">
                <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-2 text-xs">
                  <span className="text-red-400 font-semibold">Anomaly detected</span>
                  <span className="text-slate-400 ml-2">first at t = {anomalyStart.toFixed(2)}s</span>
                </div>
                <div className="bg-blue-950 border border-blue-800 rounded-lg px-4 py-2 text-xs text-slate-300">
                  Health locked during cyber-attack phases to prevent false recovery
                </div>
              </div>
            )}

            {/* Speed chart */}
            <Panel title="Motor Speed — True vs Sensor">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {params.attack_type !== "None" && (
                    <ReferenceLine x={params.attack_start_time} stroke="#ef4444" strokeDasharray="4 2"
                      label={{ value: "Attack", fill: "#ef4444", fontSize: 10 }} />
                  )}
                  {params.fault_type !== "None" && (
                    <ReferenceLine x={params.fault_start_time} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: "Fault", fill: "#f59e0b", fontSize: 10 }} />
                  )}
                  <Line type="monotone" dataKey="actual" stroke="#94a3b8" dot={false} name="True Speed"
                    strokeDasharray="6 3" strokeWidth={2} />
                  <Line type="monotone" dataKey="sensor" stroke="#ef4444" dot={false} name="Sensor Reading"
                    strokeWidth={1.5} strokeOpacity={0.7} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* XGBoost confidence scatter */}
            <Panel title="XGBoost Attack Classifier — Confidence Over Time">
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" type="number" name="Time"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
                  <YAxis dataKey="prob" type="number" name="Confidence"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "%", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-slate-800 border border-slate-700 rounded p-2 text-xs">
                          <p className="text-slate-400">t = {payload[0]?.payload?.t?.toFixed(2)}s</p>
                          <p className="text-white">Confidence: {payload[0]?.payload?.prob?.toFixed(1)}%</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {/* 70% threshold line */}
                  <ReferenceLine y={70} stroke="#64748b" strokeDasharray="4 2"
                    label={{ value: "Alarm 70%", fill: "#64748b", fontSize: 9 }} />
                  {Object.entries(scatterByLabel).map(([label, pts]) => (
                    <Scatter
                      key={label}
                      name={label}
                      data={pts}
                      fill={LABEL_COLORS[label] ?? "#94a3b8"}
                      opacity={0.7}
                      r={2}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </Panel>

            {/* LSTM health index */}
            <Panel title="LSTM Health Index (0–100%) — Monotonically Decreasing · Locked During Attacks">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis domain={[0, 110]} tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "%", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="predicted_rul" stroke="#3b82f6" fill="url(#healthGrad)"
                    name="Health %" dot={false} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            {/* Explainer */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-400 space-y-1">
              <p className="text-white font-semibold text-sm mb-2">Two AI Models Working Together</p>
              <p><span className="text-orange-400 font-medium">XGBoost</span> classifies each 50-timestep sensor window into 5 categories. If speed deviates from physics without a matching current change, it's a cyber attack.</p>
              <p><span className="text-blue-400 font-medium">LSTM</span> tracks the health index (RUL). A monotonicity guardrail prevents it from reporting "fake recovery" — and during cyber attacks, the health index is <span className="text-blue-400">frozen</span> since the sensor can't be trusted.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
