import React from "react";

// ── Plain-English translations of each feature name ───────────────────────────
// These mirror ISO 13372 / IEC 60034 predictive maintenance terminology.
const FEATURE_EXPLAIN = {
  innov_mean: {
    plain:    "Sensor vs. Physics — Average Gap",
    detail:   "The physics model constantly calculates what speed the motor should be doing given the voltage applied. This is the average gap between that prediction and what the speed sensor actually reported over the last ~50 readings. Near zero = sensor is tracking correctly. A sustained positive gap means the sensor is reading higher than physics allows — the main sign of a spoofing attack. A sustained negative gap means the motor is running slower than expected, which points to friction buildup or mechanical load.",
    icon:     "📈",
    watchOut: "Sustained gap in either direction = sensor is no longer tracking real motor behaviour.",
  },
  innov_std: {
    plain:    "Sensor vs. Physics — How Erratic the Gap Is",
    detail:   "Takes the same physics-vs-sensor gap and asks: is it steady, or jumping all over the place? A healthy sensor has a small, stable gap (just ordinary electronic noise). When data packets are being dropped — by a network fault or deliberate attack — the reading arrives late or not at all, making this gap spike erratically. High variability here with no load change usually means the communication link between the sensor and control system is being interfered with.",
    icon:     "〰️",
    watchOut: "Sudden jump in variability with no load change = suspect packet dropout or cabling fault.",
  },
  innov_kurtosis: {
    plain:    "Sensor vs. Physics — Rare Sharp Spikes",
    detail:   "Normal sensor noise spreads out in a gentle bell curve of small errors. Kurtosis measures whether the gap distribution has a few very sharp, large spikes far outside the normal noise band. A bearing defect is the classic cause: the damaged ball strikes its raceway at a repeating frequency, creating short but intense impulses that the physics model cannot predict. Values above 3 (the baseline for random noise) indicate these rare extreme spikes are present.",
    icon:     "⚡",
    watchOut: "Value > 3 = impulsive spikes present → inspect bearings, coupling, and shaft alignment.",
  },
  innov_crest: {
    plain:    "Sensor vs. Physics — Single Worst Spike Ratio",
    detail:   "Divides the single largest gap spike in the window by the typical (RMS) gap level. Think of it as: how many times bigger was the worst moment compared to ordinary background noise? A ratio of 1–2 is normal. Values above 4–6 mean at least one reading was wildly out of line — in condition monitoring practice this flags an impact event, a sudden load shock, or the early onset of a bearing fault before it becomes continuous noise.",
    icon:     "🔔",
    watchOut: "Ratio > 6 = at least one extreme spike occurred — inspect bearings and shaft coupling.",
  },
  fusion_res_mean: {
    plain:    "Electrical-Mechanical Mismatch",
    detail:   "Cross-checks Ohm's Law: given the voltage and current, does the speed make sense? If the sensor reports a speed that's physically impossible for the current drawn, something is wrong — either the sensor is compromised or there's a winding issue.",
    icon:     "🔌",
    watchOut: "High mismatch = sensor reading is not consistent with electrical measurements → verify sensor integrity.",
  },
  fusion_res_std: {
    plain:    "Mismatch Variability",
    detail:   "Stability of the electrical-mechanical cross-check. High variance in this check can indicate intermittent winding faults or fluctuating loads masking an attack.",
    icon:     "🌊",
    watchOut: "Rising variability after a steady period = investigate power supply or load variations.",
  },
  temp_mean: {
    plain:    "Average Motor Temperature",
    detail:   "Sustained high temperature is the most reliable early warning for mechanical degradation. Friction buildup, misalignment, and poor lubrication all show up here first — often 30–60 minutes before a speed change is measurable.",
    icon:     "🌡️",
    watchOut: "Temperature > 60°C sustained = check lubrication, cooling fan, and bearing pre-load.",
  },
  temp_slope: {
    plain:    "Temperature Trend (Rising/Falling)",
    detail:   "Rate at which temperature is changing. In predictive maintenance, a consistently positive slope (temperature rising) is the leading indicator of Friction Buildup — often more reliable than the temperature value alone.",
    icon:     "📉",
    watchOut: "Positive slope sustained > 2 minutes = schedule lubrication check within 24 hours.",
  },
  res_slope: {
    plain:    "Electrical Mismatch Trend",
    detail:   "Whether the electrical-mechanical mismatch is getting worse over time. A steady upward trend in this during an attack or fault means the situation is deteriorating, not stable.",
    icon:     "📊",
    watchOut: "Upward trend during operation = worsening condition, do not defer maintenance.",
  },
};

// ── What-to-do cards per AI classification ─────────────────────────────────
const ACTION_CARDS = {
  "Normal": {
    color:   "border-green-700 bg-green-950/30",
    badge:   "bg-green-800 text-green-100",
    title:   "All Clear — System Operating Normally",
    icon:    "✅",
    actions: [
      "Continue normal operation. No intervention required.",
      "Next scheduled inspection: follow your planned maintenance calendar.",
      "Monitor temperature trend — if it begins rising, reassess within 4 hours.",
    ],
    iso: "ISO 13373-1: Normal vibration envelope — no alarm threshold exceeded.",
  },
  "Mechanical Fault": {
    color:   "border-orange-700 bg-orange-950/30",
    badge:   "bg-orange-800 text-orange-100",
    title:   "Physical Degradation Detected",
    icon:    "⚙️",
    actions: [
      "Schedule a condition inspection within 24 hours — do not defer.",
      "Check lubrication levels and bearing temperature at the next safe opportunity.",
      "Monitor temp_slope (Temperature Trend): if still rising, escalate to immediate inspection.",
      "Sensor readings are trustworthy — this is a real physical change, not a cyber event.",
      "Log the event timestamp for your maintenance records (ISO 14224 failure mode entry).",
    ],
    iso: "Consistent with ISO 13373-3 Fault Classes: mechanical looseness or bearing defect signature.",
  },
  "Sensor Spoofing": {
    color:   "border-red-700 bg-red-950/30",
    badge:   "bg-red-800 text-red-100",
    title:   "Cyber Attack — Sensor Spoofing",
    icon:    "🚨",
    actions: [
      "DO NOT trust the speed sensor reading — it has been manipulated.",
      "Use the Defended Speed (Kalman prediction) for all control decisions.",
      "Isolate the sensor node from the network and check for unauthorized access.",
      "The motor itself is physically fine — the attack is on the data, not the machine.",
      "Document the incident: start time, duration, and affected sensor node.",
      "Escalate to your cybersecurity team per IEC 62443-3-3 incident response procedure.",
    ],
    iso: "IEC 62443-3-3 SR 3.1: Data integrity violation — sensor value inconsistent with physical model.",
  },
  "Packet Dropout": {
    color:   "border-red-700 bg-red-950/30",
    badge:   "bg-red-800 text-red-100",
    title:   "Cyber Attack — Packet Dropout",
    icon:    "📡",
    actions: [
      "Sensor data packets are being dropped — readings are unreliable.",
      "Use digital twin predictions for control until communications are restored.",
      "Check network switch, fieldbus cabling, and firewall rules for interference.",
      "If packet loss is selective (affecting only this sensor), treat as targeted attack.",
      "Escalate to IT/OT security team for network forensics.",
    ],
    iso: "IEC 62443-3-3 SR 3.1: Communication integrity — selective packet loss indicates active interference.",
  },
  "Freezing Sensor": {
    color:   "border-purple-700 bg-purple-950/30",
    badge:   "bg-purple-800 text-purple-100",
    title:   "Cyber Attack — Sensor Frozen",
    icon:    "❄️",
    actions: [
      "The sensor is reporting a fixed/static value — it has been frozen by an attacker.",
      "A frozen sensor is particularly dangerous: it masks all real changes (faults AND normal operation).",
      "Immediately switch to Kalman-predicted values for process control.",
      "Physically inspect the sensor head and its network interface card.",
      "Replace the sensor or reboot the sensing unit before restoring to service.",
    ],
    iso: "IEC 62443-3-3 SR 3.1: Sensor output constant despite known operational changes — integrity violation.",
  },
};

// ── Bar chart for feature importance ─────────────────────────────────────────
const Bar = ({ value, max }) => {
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const color = value >= 0 ? "bg-orange-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`text-right font-mono w-16 ${value >= 0 ? "text-orange-300" : "text-blue-300"}`}>
        {value >= 0 ? "+" : ""}{value.toFixed(4)}
      </span>
      <div className="flex-1 bg-slate-700 rounded h-2">
        <div className={`${color} h-2 rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function ShapViewer({ results }) {
  if (!results?.shap_summary_img) return null;

  const label  = results.ai_dominant_label ?? "Normal";
  const maxVal = Math.max(...results.shap_top_features.map((f) => Math.abs(f.value)));

  return (
    <div className="mt-6 space-y-5">

      {/* ── 1. SHAP charts — always visible ── */}
      <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 space-y-4">
        <h3 className="text-sm font-semibold text-white">AI Explainability — SHAP Analysis</h3>
        <p className="text-xs text-slate-500">
          SHAP (SHapley Additive exPlanations) uses game theory to show exactly which sensor signals drove the model's decision.
        </p>

        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Global Feature Importance (all windows in this run)
          </h4>
          <div className="rounded overflow-hidden border border-slate-700">
            <img
              src={`data:image/png;base64,${results.shap_summary_img}`}
              alt="SHAP global summary"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Prediction Waterfall — Last Sensor Window
          </h4>
          <div className="rounded overflow-hidden border border-slate-700">
            <img
              src={`data:image/png;base64,${results.shap_waterfall_img}`}
              alt="SHAP waterfall"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* ── 2. KEY INDICATORS in plain English ── */}
      <div className="border border-slate-700 rounded-lg p-4 bg-slate-900">
        <h3 className="text-sm font-semibold text-white mb-1">What the AI Detected</h3>
        <p className="text-xs text-slate-500 mb-4">
          The top signals that drove this classification — explained in maintenance terms.
        </p>

        <div className="space-y-3">
          {results.shap_top_features.map(({ feature, value }) => {
            const info = FEATURE_EXPLAIN[feature] ?? { plain: feature, detail: "", icon: "•", watchOut: "" };
            const direction = value >= 0 ? "pushed toward alarm" : "argued against alarm";
            const dirColor  = value >= 0 ? "text-orange-400" : "text-blue-400";
            return (
              <div key={feature} className="border border-slate-800 rounded p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-mono font-semibold text-white">{feature}</p>
                  <span className={`text-xs font-medium shrink-0 ${dirColor}`}>{direction}</span>
                </div>

                {/* Bar */}
                <Bar value={value} max={maxVal} />

                {/* Plain-English explanation */}
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">{info.plain} — </span>
                  {info.detail}
                </p>

                {/* Watch-out */}
                {info.watchOut && (
                  <div className="flex gap-1.5 items-start">
                    <span className="text-yellow-500 text-xs shrink-0">⚠</span>
                    <p className="text-xs text-yellow-400">{info.watchOut}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Quick-reference legend ── */}
      <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Reading the AI Evidence — Quick Reference
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="space-y-1.5">
            <p className="font-medium text-orange-400">Orange bar (positive value)</p>
            <p>This signal pushed the AI <strong className="text-white">toward</strong> raising an alarm. A large orange bar means this feature was strong evidence for the detected condition.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-blue-400">Blue bar (negative value)</p>
            <p>This signal argued <strong className="text-white">against</strong> the alarm. A large blue bar means other evidence is partially countering the alarm — monitor, but don't panic yet.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-white">Short bar (near zero)</p>
            <p>This feature had little influence on this reading. Conditions were within its expected range.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-slate-300">All bars short</p>
            <p>No single feature dominated the decision — the AI classified based on a combination of weak signals. Confidence may be lower; review the waterfall chart.</p>
          </div>
        </div>
      </div>


    </div>
  );
}
