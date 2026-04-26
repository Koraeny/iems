import { useState, useEffect } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";
import { apiGetSettings, apiUpdateSettings } from "../utils/api";

const BASE = "http://localhost:5000/api";

export default function SettingsPage() {
  const { token, user } = useAuth();
  const [form, setForm] = useState({
    alert_threshold_kwh: 50,
    anomaly_std_factor: 2,
    working_hours_start: 8,
    working_hours_end: 18,
    auto_control_enabled: true,
  });
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoOffMsg, setAutoOffMsg] = useState("");
  const isAdmin = user?.role === "administrator";

  useEffect(() => {
    apiGetSettings(token).then(data => {
      const g = data.settings.find(s => !s.zone_id) ?? data.settings[0];
      if (g) setForm({
        alert_threshold_kwh:  g.alert_threshold_kwh,
        anomaly_std_factor:   g.anomaly_std_factor,
        working_hours_start:  g.working_hours_start,
        working_hours_end:    g.working_hours_end,
        auto_control_enabled: g.auto_control_enabled,
      });
    }).finally(() => setLoading(false));
  }, [token]);

  const save = async (e) => {
    e.preventDefault();
    await apiUpdateSettings(token, { ...form, zone_id: null });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const runAutoOff = async () => {
    setAutoOffMsg("");
    const res = await fetch(`${BASE}/devices/auto-off`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    const data = await res.json();
    setAutoOffMsg(data.message);
  };

  return (
    <div style={s.layout}>
      <Sidebar />
      <main style={s.main}>
        <h1 style={s.pageTitle}>Settings</h1>
        <p style={s.pageSub}>Configure thresholds, automation rules, and scheduled control</p>

        {!isAdmin && <div style={s.warning}>⚠️ Read-only. Only administrators can change settings.</div>}

        {loading ? <p style={{ color:"#64748b" }}>Loading…</p> : (
          <form onSubmit={save} style={s.form}>

            {/* Thresholds */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Alert Thresholds</h2>
              <div style={s.field}>
                <label style={s.label}>Alert Threshold (kWh)</label>
                <p style={s.hint}>Trigger a HIGH alert when any reading exceeds this value.</p>
                <input style={s.input} type="number" step="0.5" min="1"
                  value={form.alert_threshold_kwh} disabled={!isAdmin}
                  onChange={e => setForm({ ...form, alert_threshold_kwh: parseFloat(e.target.value) })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Anomaly Sensitivity (σ factor)</label>
                <p style={s.hint}>Flag if reading exceeds mean + (factor × std deviation). Lower = more sensitive.</p>
                <input style={s.input} type="number" step="0.1" min="0.5" max="5"
                  value={form.anomaly_std_factor} disabled={!isAdmin}
                  onChange={e => setForm({ ...form, anomaly_std_factor: parseFloat(e.target.value) })} />
              </div>
            </div>

            {/* Working Hours */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Working Hours</h2>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Start Hour (0–23)</label>
                  <input style={s.input} type="number" min="0" max="23"
                    value={form.working_hours_start} disabled={!isAdmin}
                    onChange={e => setForm({ ...form, working_hours_start: parseInt(e.target.value) })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>End Hour (0–23)</label>
                  <input style={s.input} type="number" min="0" max="23"
                    value={form.working_hours_end} disabled={!isAdmin}
                    onChange={e => setForm({ ...form, working_hours_end: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Auto Control */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Automation</h2>
              <div style={s.toggleRow}>
                <div>
                  <div style={s.label}>Auto Control Actions</div>
                  <p style={s.hint}>Automatically reduce load when anomalies are detected.</p>
                </div>
                <label style={{ display:"flex", alignItems:"center", cursor:"pointer" }}>
                  <input type="checkbox" checked={form.auto_control_enabled} disabled={!isAdmin}
                    onChange={e => setForm({ ...form, auto_control_enabled: e.target.checked })}
                    style={{ display:"none" }} />
                  <span style={{ display:"inline-block", width:44, height:24, borderRadius:12, position:"relative", background: form.auto_control_enabled ? "#38bdf8" : "#334155", transition:"background 0.2s", cursor:"pointer" }}>
                    <span style={{ position:"absolute", top:3, left:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"transform 0.2s", transform: form.auto_control_enabled ? "translateX(20px)" : "translateX(0)" }} />
                  </span>
                </label>
              </div>
            </div>

            {/* Scheduled Auto-Off */}
            {isAdmin && (
              <div style={s.section}>
                <h2 style={s.sectionTitle}>Scheduled Control</h2>
                <p style={s.hint}>Manually trigger the end-of-day auto-off routine. Turns off all non-server-room devices outside working hours.</p>
                <button type="button" onClick={runAutoOff} style={s.autoOffBtn}>
                  ⏹ Run Scheduled Auto-Off Now
                </button>
                {autoOffMsg && <div style={s.autoOffMsg}>{autoOffMsg}</div>}
              </div>
            )}

            {isAdmin && (
              <button type="submit" style={s.saveBtn}>
                {saved ? "✔ Saved!" : "Save Settings"}
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

const s = {
  layout:      { display:"flex", minHeight:"100vh", background:"#060d1a", fontFamily:"'Segoe UI',sans-serif" },
  main:        { flex:1, padding:"32px 40px", maxWidth:760 },
  pageTitle:   { color:"#f1f5f9", fontSize:26, fontWeight:700, margin:0 },
  pageSub:     { color:"#64748b", fontSize:13, margin:"6px 0 28px" },
  warning:     { background:"#451a03", color:"#fb923c", border:"1px solid #7c2d12", padding:"12px 16px", borderRadius:8, marginBottom:24, fontSize:13 },
  form:        { display:"flex", flexDirection:"column", gap:24 },
  section:     { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24 },
  sectionTitle:{ color:"#e2e8f0", fontSize:16, fontWeight:600, margin:"0 0 20px" },
  field:       { marginBottom:16 },
  row:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  label:       { display:"block", color:"#94a3b8", fontSize:13, fontWeight:600, marginBottom:4 },
  hint:        { color:"#475569", fontSize:12, margin:"0 0 8px" },
  input:       { width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:14, boxSizing:"border-box" },
  toggleRow:   { display:"flex", justifyContent:"space-between", alignItems:"center" },
  autoOffBtn:  { background:"#450a0a", color:"#f87171", border:"1px solid #f87171", borderRadius:8, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:14 },
  autoOffMsg:  { marginTop:12, background:"#052e16", color:"#4ade80", border:"1px solid #166534", padding:"10px 14px", borderRadius:6, fontSize:13 },
  saveBtn:     { background:"#38bdf8", color:"#0a0f1e", border:"none", borderRadius:8, padding:"12px 28px", fontWeight:700, fontSize:15, cursor:"pointer", alignSelf:"flex-start" },
};
