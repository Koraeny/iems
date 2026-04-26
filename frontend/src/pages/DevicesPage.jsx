import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";
import {
  apiGetDevices, apiToggleDevice, apiZoneOff, apiZoneOn, apiDeviceLogs, apiDeviceSummary
} from "../utils/api";

const typeIcon  = { light: "💡", ac: "❄️", outlet: "🔌", master: "⚡" };
const typeLabel = { light: "Light", ac: "AC / HVAC", outlet: "Power Outlet", master: "Master Switch" };

export default function DevicesPage() {
  const { token, user } = useAuth();
  const [devices,  setDevices]  = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeZone, setActiveZone] = useState(null);
  const [toggling, setToggling] = useState({});
  const [tab, setTab] = useState("devices"); // "devices" | "logs"

  const isAdmin = user?.role === "administrator";

  const load = useCallback(async () => {
    try {
      const [d, s, l] = await Promise.all([
        apiGetDevices(token),
        apiDeviceSummary(token),
        apiDeviceLogs(token),
      ]);
      setDevices(d.devices);
      setSummary(s.summary);
      setLogs(l.logs);
      if (!activeZone && s.summary.length > 0) setActiveZone(s.summary[0].zone_id);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (device, newStatus) => {
    if (!isAdmin) return;
    setToggling(t => ({ ...t, [device.id]: true }));
    try {
      await apiToggleDevice(token, device.id, newStatus, `Manual ${newStatus} via dashboard`);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: newStatus } : d));
      await load();
    } finally {
      setToggling(t => ({ ...t, [device.id]: false }));
    }
  };

  const zoneAction = async (zone_id, action) => {
    if (!isAdmin) return;
    const reason = `Zone ${action === 'off' ? 'shutdown' : 'power restored'} by administrator`;
    if (action === 'off') await apiZoneOff(token, zone_id, reason);
    else await apiZoneOn(token, zone_id, reason);
    await load();
  };

  const zoneDevices = devices.filter(d => d.zone_id === activeZone);
  const activeSummary = summary.find(s => s.zone_id === activeZone);

  return (
    <div style={s.layout}>
      <Sidebar />
      <main style={s.main}>
        {/* Header */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Device Control</h1>
            <p style={s.pageSub}>Remote monitoring and control of all office devices</p>
          </div>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === "devices" ? s.tabActive : {}) }}
              onClick={() => setTab("devices")}>🔌 Devices</button>
            <button style={{ ...s.tab, ...(tab === "logs" ? s.tabActive : {}) }}
              onClick={() => setTab("logs")}>📋 Control Log</button>
          </div>
        </div>

        {!isAdmin && (
          <div style={s.warning}>⚠️ You have read-only access. Only administrators can control devices.</div>
        )}

        {loading ? <p style={s.loading}>Loading devices…</p> : tab === "devices" ? (
          <div style={s.content}>
            {/* Zone selector + summary cards */}
            <div style={s.zoneSummaryRow}>
              {summary.map(z => (
                <div key={z.zone_id}
                  onClick={() => setActiveZone(z.zone_id)}
                  style={{ ...s.zoneCard, ...(activeZone === z.zone_id ? s.zoneCardActive : {}) }}>
                  <div style={s.zoneName}>{z.zone_name}</div>
                  <div style={s.zoneStats}>
                    <span style={{ color: "#4ade80" }}>● {z.on} on</span>
                    <span style={{ color: "#f87171" }}>● {z.off} off</span>
                  </div>
                  <div style={s.zoneWatts}>{z.active_watts}W active</div>
                </div>
              ))}
            </div>

            {/* Active zone controls */}
            {activeSummary && (
              <div style={s.zonePanel}>
                <div style={s.zonePanelHeader}>
                  <div>
                    <h2 style={s.zonePanelTitle}>{activeSummary.zone_name}</h2>
                    <p style={s.zonePanelSub}>
                      {activeSummary.on} devices on · {activeSummary.off} off · {activeSummary.active_watts}W consuming
                    </p>
                  </div>
                  {isAdmin && (
                    <div style={s.zoneActions}>
                      <button style={s.zoneOnBtn}
                        onClick={() => zoneAction(activeZone, 'on')}>
                        ▶ All On
                      </button>
                      <button style={s.zoneOffBtn}
                        onClick={() => zoneAction(activeZone, 'off')}>
                        ⏹ All Off
                      </button>
                    </div>
                  )}
                </div>

                {/* Device grid */}
                <div style={s.deviceGrid}>
                  {zoneDevices.map(device => (
                    <div key={device.id} style={{
                      ...s.deviceCard,
                      ...(device.status === 'off' ? s.deviceCardOff : {})
                    }}>
                      <div style={s.deviceTop}>
                        <span style={s.deviceIcon}>{typeIcon[device.type]}</span>
                        <span style={{
                          ...s.deviceStatus,
                          background: device.status === 'on' ? "#052e16" : "#1c1917",
                          color: device.status === 'on' ? "#4ade80" : "#f87171"
                        }}>
                          {device.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={s.deviceName}>{device.name}</div>
                      <div style={s.deviceType}>{typeLabel[device.type]}</div>
                      {device.power_watts > 0 && (
                        <div style={s.deviceWatts}>
                          {device.status === 'on'
                            ? `${device.power_watts}W consuming`
                            : `${device.power_watts}W rated`}
                        </div>
                      )}

                      {/* Toggle switch */}
                      {isAdmin && (
                        <div style={s.toggleRow}>
                          <span style={s.toggleLabel}>Off</span>
                          <button
                            disabled={toggling[device.id]}
                            onClick={() => toggle(device, device.status === 'on' ? 'off' : 'on')}
                            style={{
                              ...s.toggleBtn,
                              background: device.status === 'on' ? "#38bdf8" : "#334155"
                            }}>
                            <span style={{
                              ...s.toggleKnob,
                              transform: device.status === 'on' ? "translateX(20px)" : "translateX(2px)"
                            }} />
                          </button>
                          <span style={s.toggleLabel}>On</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Logs tab */
          <div style={s.logsPanel}>
            <h2 style={s.sectionTitle}>Device Control Log</h2>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Time", "Device", "Zone", "Action", "Triggered By", "User", "Reason"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={s.tr}>
                    <td style={s.td}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={s.td}>{log.device_name}</td>
                    <td style={s.td}>{log.zone_name}</td>
                    <td style={s.td}>
                      <span style={{
                        color: log.action === 'on' ? "#4ade80" : "#f87171",
                        fontWeight: 700
                      }}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td style={s.td}>{log.triggered_by}</td>
                    <td style={s.td}>{log.user}</td>
                    <td style={s.td}>{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  layout:      { display: "flex", minHeight: "100vh", background: "#060d1a", fontFamily: "'Segoe UI', sans-serif" },
  main:        { flex: 1, padding: "32px 40px", overflowY: "auto" },
  topBar:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle:   { color: "#f1f5f9", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSub:     { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  tabs:        { display: "flex", gap: 8 },
  tab:         { background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  tabActive:   { background: "#1e3a5f", color: "#38bdf8" },
  warning:     { background: "#451a03", color: "#fb923c", border: "1px solid #7c2d12", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13 },
  loading:     { color: "#64748b", textAlign: "center", marginTop: 60 },
  content:     { display: "flex", flexDirection: "column", gap: 24 },
  zoneSummaryRow: { display: "flex", gap: 14, flexWrap: "wrap" },
  zoneCard:    { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", cursor: "pointer", minWidth: 160, transition: "all 0.2s" },
  zoneCardActive: { border: "1px solid #38bdf8", background: "#0c1f35" },
  zoneName:    { color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 8 },
  zoneStats:   { display: "flex", gap: 12, fontSize: 12, marginBottom: 4 },
  zoneWatts:   { color: "#64748b", fontSize: 11 },
  zonePanel:   { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 28 },
  zonePanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  zonePanelTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: 0 },
  zonePanelSub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  zoneActions: { display: "flex", gap: 10 },
  zoneOnBtn:   { background: "#052e16", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  zoneOffBtn:  { background: "#450a0a", color: "#f87171", border: "1px solid #f87171", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  deviceGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
  deviceCard:  { background: "#1e293b", borderRadius: 10, padding: 20, border: "1px solid #334155", transition: "all 0.2s" },
  deviceCardOff: { opacity: 0.6 },
  deviceTop:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  deviceIcon:  { fontSize: 26 },
  deviceStatus:{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 12 },
  deviceName:  { color: "#f1f5f9", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  deviceType:  { color: "#64748b", fontSize: 11, marginBottom: 8 },
  deviceWatts: { color: "#94a3b8", fontSize: 12, marginBottom: 14 },
  toggleRow:   { display: "flex", alignItems: "center", gap: 8 },
  toggleLabel: { color: "#64748b", fontSize: 12 },
  toggleBtn:   { width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" },
  toggleKnob:  { position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.2s" },
  sectionTitle:{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, marginBottom: 16 },
  logsPanel:   { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 24 },
  table:       { width: "100%", borderCollapse: "collapse" },
  th:          { background: "#1e293b", color: "#94a3b8", padding: "10px 12px", fontSize: 12, fontWeight: 600, textAlign: "left", borderBottom: "1px solid #334155" },
  tr:          { borderBottom: "1px solid #1e293b" },
  td:          { color: "#e2e8f0", padding: "10px 12px", fontSize: 13 },
};
