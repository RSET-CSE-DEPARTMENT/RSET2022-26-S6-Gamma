import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8002";
const ATTACK_OPTIONS = ["Sensor Spoofing", "Freezing Sensor", "Packet Dropout"];

const Panel = ({ title, subtitle, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</h3>
    {subtitle && <p className="text-xs text-slate-600 mt-0.5 mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
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

export default function MultiMotorView() {
  const [params, setParams] = useState({
    attack_type: "Sensor Spoofing",
    attack_magnitude: 3.0,
    attack_start_time: 3.0,
    duration: 6.0,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setParams((p) => ({ ...p, [key]: val }));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/multi-motor`, params);
      setResults(data);
      toast.success("Swarm simulation complete");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Backend error");
    } finally {
      setLoading(false);
    }
  };

  const chartData = results
    ? results.time.map((t, i) => ({
        t: +t.toFixed(3),
        A_sensor:   results.A_sensor[i],
        A_defended: results.A_defended[i],
        B_sensor:   results.B_sensor[i],
      }))
    : [];

  // Compute deltas for comparison section
  const maxDeviation = results
    ? Math.max(...results.time.map((_, i) =>
        Math.abs(results.A_sensor[i] - results.B_sensor[i])
      )).toFixed(3)
    : null;
  const maxRecovery = results
    ? Math.max(...results.time.map((_, i) =>
        Math.abs(results.A_defended[i] - results.A_sensor[i])
      )).toFixed(3)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <Field label="Attack on Motor A">
            <Sel value={params.attack_type} onChange={set("attack_type")} options={ATTACK_OPTIONS} />
          </Field>
          <Field label="Magnitude">
            <Num value={params.attack_magnitude} onChange={set("attack_magnitude")} step={0.5} min={0} />
          </Field>
          <Field label="Attack Start (s)">
            <Num value={params.attack_start_time} onChange={set("attack_start_time")} step={0.5} min={0} />
          </Field>
          <Field label="Duration (s)">
            <Num value={params.duration} onChange={set("duration")} step={1} min={2} />
          </Field>
          <button onClick={handleRun} disabled={loading}
            className="h-9 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded transition-colors">
            {loading ? "Running…" : "▶ Run"}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Motor B is always healthy (no attack, no fault) and serves as the reliable reference observer.</p>
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {!results ? (
          <div className="space-y-4 py-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <p className="text-sm font-semibold text-white mb-2">Swarm Resilience — Multi-Motor Architecture</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                In a real plant with multiple pumps, a healthy neighbour motor acts as a trusted reference.
                If Motor A's sensor deviates significantly from Motor B's — which is running the same physics — it confirms the deviation is an attack rather than a genuine load change.
                Motor A's digital twin self-heals using Kalman prediction.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { color: "text-red-400",   label: "Red — Motor A Sensor",   desc: "Hacked sensor reading (under attack)" },
                { color: "text-green-400", label: "Green — Motor A Twin",    desc: "Self-healed estimate from Kalman prediction" },
                { color: "text-blue-400",  label: "Blue — Motor B Healthy",  desc: "Trusted reference — no attack, no fault" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <p className={`text-xs font-semibold ${color} mb-0.5`}>{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center">Configure Motor A attack above and click <strong className="text-slate-400">▶ Run</strong></p>
          </div>
        ) : (
          <>
            {/* Comparison metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-red-900 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">Max A vs B Deviation</p>
                <p className="text-red-400 font-semibold text-sm">{maxDeviation} rad/s</p>
                <p className="text-xs text-slate-600">Attack signature magnitude</p>
              </div>
              <div className="bg-slate-900 border border-green-900 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">Max Defense Correction</p>
                <p className="text-green-400 font-semibold text-sm">{maxRecovery} rad/s</p>
                <p className="text-xs text-slate-600">How much the twin corrected Motor A</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">Attack Start</p>
                <p className="text-white font-semibold text-sm">t = {params.attack_start_time}s</p>
                <p className="text-xs text-slate-600">{params.attack_type}</p>
              </div>
            </div>

            {/* Motor A chart */}
            <Panel
              title="Motor A — Target of Attack"
              subtitle="Red = hacked sensor reading  ·  Green = self-healed by digital twin"
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={params.attack_start_time} stroke="#ef4444" strokeDasharray="4 2"
                    label={{ value: "Attack", fill: "#ef4444", fontSize: 10 }} />
                  <Line type="monotone" dataKey="A_sensor"   stroke="#ef4444" dot={false}
                    name="Motor A — Sensor (hacked)" strokeWidth={1.5} strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="A_defended" stroke="#22c55e" dot={false}
                    name="Motor A — Self-Healed (Twin)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* Motor B chart */}
            <Panel
              title="Motor B — Healthy Observer"
              subtitle="Blue = healthy reference — Motor B's signal helps confirm if A is being attacked"
            >
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="B_sensor" stroke="#3b82f6" dot={false}
                    name="Motor B — Healthy" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* Combined comparison */}
            <Panel title="Combined View — All Three Signals">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={params.attack_start_time} stroke="#ef4444" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="A_sensor"   stroke="#ef4444" dot={false} name="A Sensor (hacked)"     strokeWidth={1} strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="A_defended" stroke="#22c55e" dot={false} name="A Defended (Twin)"     strokeWidth={2} />
                  <Line type="monotone" dataKey="B_sensor"   stroke="#3b82f6" dot={false} name="B Healthy (Observer)"  strokeWidth={1.5} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* Explainer */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-400 space-y-1">
              <p className="text-white font-semibold text-sm mb-2">Swarm Resilience — Multi-Motor Architecture</p>
              <p>In a real plant with multiple pumps, a healthy neighbor motor acts as a <span className="text-blue-400">trusted reference</span>. If Motor A's sensor deviates significantly from Motor B's (which is physically similar), it confirms the deviation is an attack rather than a load change.</p>
              <p>Motor A's digital twin self-heals using Kalman prediction when XGBoost detects the attack — maintaining accurate speed estimates even while the sensor is compromised.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
