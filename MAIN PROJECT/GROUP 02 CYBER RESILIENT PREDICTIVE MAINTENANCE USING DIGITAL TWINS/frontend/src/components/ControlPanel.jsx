import React, { useState } from "react";

const FAULT_TYPES   = ["None", "Friction Buildup", "Bearing Fault"];
const ATTACK_TYPES  = ["None", "Sensor Spoofing", "Freezing Sensor", "Packet Dropout"];

const Field = ({ label, hint, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-300 flex justify-between">
      <span>{label}</span>
      {hint && <span className="text-slate-500 font-normal">{hint}</span>}
    </label>
    {children}
  </div>
);

const NumberInput = ({ value, onChange, step = 0.1, min }) => (
  <input
    type="number"
    value={value}
    step={step}
    min={min}
    onChange={(e) => onChange(parseFloat(e.target.value))}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white
               focus:outline-none focus:ring-1 focus:ring-blue-500"
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white
               focus:outline-none focus:ring-1 focus:ring-blue-500"
  >
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const TABS = ["Physics", "Faults", "Attacks"];

export default function ControlPanel({ params, onChange, onRun, loading }) {
  const [tab, setTab] = useState("Physics");

  const set = (key) => (val) => onChange({ ...params, [key]: val });

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-white">Simulation Parameters</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure the pump twin and run</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-2 font-medium transition-colors
              ${tab === t
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-500 hover:text-slate-300"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === "Physics" && (
          <>
            <Field label="Supply Voltage (V)" hint="Motor drive voltage">
              <NumberInput value={params.voltage} onChange={set("voltage")} step={0.5} />
            </Field>
            <Field label="Load Torque (Nm)" hint="External pump load">
              <NumberInput value={params.load_torque} onChange={set("load_torque")} step={0.1} />
            </Field>
            <Field label="Inertia J (kg·m²)" hint="Rotor/impeller inertia">
              <NumberInput value={params.J} onChange={set("J")} step={1} min={0.1} />
            </Field>
            <Field label="Friction b" hint="Viscous friction coefficient">
              <NumberInput value={params.b} onChange={set("b")} step={0.001} min={0} />
            </Field>
            <Field label="Torque Constant Kt" hint="Motor torque constant">
              <NumberInput value={params.Kt} onChange={set("Kt")} step={0.01} min={0.01} />
            </Field>
            <Field label="Duration (s)" hint="Simulation length">
              <NumberInput value={params.duration} onChange={set("duration")} step={5} min={5} />
            </Field>
            <Field label="Sensor Noise" hint="Gaussian noise std dev">
              <NumberInput value={params.noise_level} onChange={set("noise_level")} step={0.01} min={0} />
            </Field>
          </>
        )}

        {tab === "Faults" && (
          <>
            <Field label="Fault Type" hint="Physical degradation mode">
              <Select value={params.fault_type} onChange={set("fault_type")} options={FAULT_TYPES} />
            </Field>
            {params.fault_type !== "None" && (
              <>
                <Field label="Severity (0–1)" hint="Fault intensity">
                  <NumberInput value={params.fault_severity} onChange={set("fault_severity")} step={0.1} min={0} />
                </Field>
                <Field label="Start Time (s)" hint="When fault begins">
                  <NumberInput value={params.fault_start_time} onChange={set("fault_start_time")} step={0.5} min={0} />
                </Field>
              </>
            )}
            {params.fault_type === "None" && (
              <p className="text-xs text-slate-600 italic">Select a fault type to configure it.</p>
            )}
          </>
        )}

        {tab === "Attacks" && (
          <>
            <Field label="Attack Type" hint="Cyber attack on sensor">
              <Select value={params.attack_type} onChange={set("attack_type")} options={ATTACK_TYPES} />
            </Field>
            {params.attack_type !== "None" && (
              <>
                <Field label="Magnitude" hint="Attack intensity offset">
                  <NumberInput value={params.attack_magnitude} onChange={set("attack_magnitude")} step={0.5} />
                </Field>
                <Field label="Start Time (s)" hint="When attack begins">
                  <NumberInput value={params.attack_start_time} onChange={set("attack_start_time")} step={0.5} min={0} />
                </Field>
              </>
            )}
            {params.attack_type === "None" && (
              <p className="text-xs text-slate-600 italic">Select an attack type to configure it.</p>
            )}
          </>
        )}
      </div>

      {/* Run button */}
      <div className="px-4 py-4 border-t border-slate-800">
        <button
          onClick={onRun}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
                     text-white text-sm font-semibold py-2.5 rounded transition-colors"
        >
          {loading ? "Running simulation…" : "▶  Run Simulation"}
        </button>
      </div>
    </div>
  );
}
