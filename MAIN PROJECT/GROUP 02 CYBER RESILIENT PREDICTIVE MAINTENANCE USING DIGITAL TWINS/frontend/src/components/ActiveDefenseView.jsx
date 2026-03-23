import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8002";

const ATTACK_OPTIONS  = ["None", "Sensor Spoofing", "Freezing Sensor", "Packet Dropout"];
const FAULT_OPTIONS   = ["None", "Friction Buildup", "Bearing Fault"];

const Panel = ({ title, children, className = "" }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-lg p-4 ${className}`}>
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

const Field = ({ label, hint, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-300 flex justify-between">
      <span>{label}</span>
      {hint && <span className="text-slate-500 font-normal">{hint}</span>}
    </label>
    {children}
  </div>
);

const Sel = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
  >
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Num = ({ value, onChange, step = 0.5, min }) => (
  <input
    type="number"
    value={value}
    step={step}
    min={min}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
  />
);

export default function ActiveDefenseView() {
  const [params, setParams] = useState({
    attack_type: "Sensor Spoofing",
    attack_magnitude: 10.0,
    attack_start_time: 3.0,
    fault_type: "None",
    fault_severity: 0.5,
    fault_start_time: 3.0,
    duration: 8.0,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setParams((p) => ({ ...p, [key]: val }));

  const handleRun = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/active-defense`, params);
      setResults(data);
      toast.success("Active defense simulation complete");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Backend error");
    } finally {
      setLoading(false);
    }
  };

  const chartData = results
    ? results.time.map((t, i) => ({
        t: +t.toFixed(3),
        actual:   results.actual[i],
        sensor:   results.sensor[i],
        defended: results.defended[i],
        power:    results.power[i],
        attack:   results.attack[i] ? 1 : 0,
      }))
    : [];

  const audit = results?.audit;

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
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
          <button
            onClick={handleRun}
            disabled={loading}
            className="h-9 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
                       text-white text-sm font-semibold rounded transition-colors"
          >
            {loading ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {!results ? (
          <div className="space-y-4 py-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <p className="text-sm font-semibold text-white mb-2">Kalman Gatekeeper — Active Defense</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Per-timestep: the Kalman filter predicts the motor's next speed using physics alone. XGBoost classifies each 50-step window.
                If a cyber attack is detected with &gt; 70 % confidence, the filter <span className="text-green-400 font-medium">ignores the sensor</span> and uses the physics prediction instead — the control loop continues unaffected.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { color: "text-slate-400",  label: "Grey dashed",  desc: "True motor speed (ground truth)" },
                { color: "text-red-400",    label: "Red line",     desc: "Hacked sensor reading" },
                { color: "text-green-400",  label: "Green line",   desc: "Defended speed (Kalman prediction)" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded p-3">
                  <p className={`text-xs font-semibold ${color} mb-0.5`}>{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center">Configure parameters above and click <strong className="text-slate-400">▶ Run</strong></p>
          </div>
        ) : (
          <>
            {/* Audit card */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Status",           value: audit.status,                                            color: audit.attack_detected ? "text-red-400" : "text-green-400" },
                { label: "Detected Class",   value: audit.detected_class,                                    color: audit.attack_detected ? "text-orange-400" : "text-slate-400" },
                { label: "Timesteps Flagged",value: `${audit.pct_flagged}%`,                                 color: audit.attack_detected ? "text-red-300" : "text-slate-400" },
                { label: "Defense RMSE",     value: `${parseFloat(audit.rmse).toFixed(4)} rad/s`,            color: "text-white" },
                { label: "Total Energy",     value: `${parseFloat(audit.total_energy).toFixed(2)} J`,        color: "text-white" },
                { label: "Duration",         value: `${parseFloat(audit.duration).toFixed(1)}s`,             color: "text-white" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className={`text-sm font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Speed chart */}
            <Panel title="Speed — True · Sensor · Defended (Kalman Gatekeeper)">
              <ResponsiveContainer width="100%" height={240}>
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
                  <Line type="monotone" dataKey="actual"   stroke="#94a3b8" dot={false} name="True Speed"    strokeDasharray="6 3" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="sensor"   stroke="#ef4444" dot={false} name="Sensor (hacked)" strokeWidth={1} strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="defended" stroke="#22c55e" dot={false} name="Defended (Twin)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* Power chart */}
            <Panel title="Power Consumption — Energy Fingerprinting">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }}
                    label={{ value: "Watts", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="power" stroke="#3b82f6" fill="url(#pwrGrad)" name="Power (W)" dot={false} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            {/* Explainer */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-400 space-y-1">
              <p className="text-white font-semibold text-sm mb-2">How Active Defense Works</p>
              <p>The Kalman filter predicts the motor's next state using physics alone (no sensor).</p>
              <p>Each 50-timestep window is classified by XGBoost. If a cyber attack is detected (&gt;70% confidence), the system <span className="text-green-400">ignores the sensor</span> and uses the physics prediction instead.</p>
              <p>When the attack stops, normal Kalman fusion resumes automatically.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
