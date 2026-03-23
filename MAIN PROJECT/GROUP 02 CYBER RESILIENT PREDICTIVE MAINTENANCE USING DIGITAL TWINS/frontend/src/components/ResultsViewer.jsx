import React from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, defs, linearGradient, stop,
} from "recharts";
import ShapViewer from "./ShapViewer";

const CustomTooltip = ({ active, payload, label }) => {
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

const Panel = ({ title, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</h3>
    {children}
  </div>
);

export default function ResultsViewer({ results, params, onExport }) {
  if (!results) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Single Motor Simulation</h2>
          <p className="text-sm text-slate-500">
            Configure the motor parameters in the sidebar, then click <strong className="text-white">Run Simulation</strong>.
            The digital twin will run the full physics pipeline and return 4 output sections below.
          </p>
        </div>

        {/* Output preview cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "📈", title: "Motor Speed",        desc: "True physics speed vs. sensor reading. Attack and fault markers shown as dashed reference lines." },
            { icon: "🏥", title: "Remaining Useful Life", desc: "LSTM-predicted health index (0–100 %). Monotonically decreasing — never increases even if sensor clears." },
            { icon: "⚠️", title: "Anomaly Residual",   desc: "|sensor − twin| over time. Spikes when sensor deviates from physics — key attack indicator." },
            { icon: "🔍", title: "SHAP Explainability", desc: "Feature-level breakdown of what drove the XGBoost classification for this run." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-lg mb-2">{icon}</p>
              <p className="text-sm font-semibold text-white mb-1">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Attack class legend */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">XGBoost — 5 Detectable Conditions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: "Normal",           color: "text-green-400",  desc: "Sensor matches physics within noise band" },
              { label: "Sensor Spoofing",  color: "text-red-400",    desc: "Speed biased away from physics prediction" },
              { label: "Packet Dropout",   color: "text-purple-400", desc: "Missing/delayed sensor packets" },
              { label: "Freezing Sensor",  color: "text-yellow-400", desc: "Sensor stuck at constant value" },
              { label: "Friction Buildup", color: "text-orange-400", desc: "Physical wear slowing the motor" },
              { label: "Bearing Fault",    color: "text-amber-400",  desc: "Vibration impulses in innovation signal" },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
                <span className="text-xs text-slate-600">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Build chart data
  const chartData = results.time.map((t, i) => ({
    t: +t.toFixed(3),
    omega_true:   results.omega_true?.[i] ?? 0,
    omega_sensor: results.omega_sensor?.[i] ?? 0,
    residual:     Math.abs((results.omega_sensor?.[i] ?? 0) - (results.omega_true?.[i] ?? 0)),
    rul:          results.ai_predicted_rul?.[i] ?? 0,
  }));

  const attackStart  = params.attack_type  !== "None" ? params.attack_start_time  : null;
  const faultStart   = params.fault_type   !== "None" ? params.fault_start_time   : null;
  const dominantLabel = results.ai_dominant_label ?? "Normal";
  const statusColor  = dominantLabel === "Normal" ? "text-green-400" : "text-red-400";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

      {/* Status header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Simulation Results</h2>
          <p className="text-xs text-slate-500">
            Duration: {params.duration}s · dt: {params.dt}s ·{" "}
            {results.time.length} timesteps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 ${statusColor}`}>
            {dominantLabel}
          </span>
          <button
            onClick={() => onExport("csv")}
            className="text-xs px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Chart 1: Speed */}
      <Panel title="Motor Speed — Twin vs Sensor">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {attackStart && <ReferenceLine x={attackStart} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Attack", fill: "#ef4444", fontSize: 10 }} />}
            {faultStart  && <ReferenceLine x={faultStart}  stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Fault",  fill: "#f59e0b", fontSize: 10 }} />}
            <Line type="monotone" dataKey="omega_true"   stroke="#3b82f6" dot={false} name="Twin (true)"  strokeWidth={1.5} />
            <Line type="monotone" dataKey="omega_sensor" stroke="#22c55e" dot={false} name="Sensor"       strokeWidth={1.5} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Chart 2: RUL */}
      <Panel title="Remaining Useful Life (RUL)">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="rulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} label={{ value: "Health %", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="rul" stroke="#f97316" fill="url(#rulGrad)" name="RUL" dot={false} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Chart 3: Residual */}
      <Panel title="Sensor Anomaly Residual |sensor − twin|">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip content={<CustomTooltip />} />
            {attackStart && <ReferenceLine x={attackStart} stroke="#ef4444" strokeDasharray="4 2" />}
            <Line type="monotone" dataKey="residual" stroke="#ef4444" dot={false} name="Residual" strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* SHAP section */}
      <ShapViewer results={results} />
    </div>
  );
}
