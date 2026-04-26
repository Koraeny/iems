import { useState, useEffect } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";
import { apiAlerts, apiResolveAlert, apiResolveAll } from "../utils/api";

const severityColor = { high: "#f87171", medium: "#fb923c", low: "#facc15" };
const typeIcon      = { anomaly: "⚠️", threshold: "🔴", system: "🔧" };

export default function AlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiAlerts(token);
      setAlerts(data.alerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    await apiResolveAlert(token, id);
    setAlerts(a => a.filter(x => x.id !== id));
  };

  const resolveAll = async () => {
    await apiResolveAll(token);
    setAlerts([]);
  };

  return (
    <div style={s.layout}>
      <Sidebar />
      <main style={s.main}>
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Alerts</h1>
            <p style={s.pageSub}>{alerts.length} unresolved alert{alerts.length !== 1 ? "s" : ""}</p>
          </div>
          {alerts.length > 0 && (
            <button onClick={resolveAll} style={s.resolveAllBtn}>✔ Resolve All</button>
          )}
        </div>

        {loading ? (
          <p style={s.empty}>Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={s.emptyIcon}>✅</div>
            <p>No active alerts. All systems normal.</p>
          </div>
        ) : (
          <div style={s.list}>
            {alerts.map(alert => (
              <div key={alert.id} style={s.alertCard}>
                <div style={s.alertLeft}>
                  <span style={s.typeIcon}>{typeIcon[alert.type] ?? "⚡"}</span>
                  <div>
                    <div style={s.alertMsg}>{alert.message}</div>
                    <div style={s.alertMeta}>
                      <span style={{ ...s.badge, background: severityColor[alert.severity] + "22", color: severityColor[alert.severity] }}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span style={s.metaText}>Zone: {alert.zone_name}</span>
                      <span style={s.metaText}>{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                    {alert.value && (
                      <div style={s.values}>
                        Reading: <strong style={{ color: "#f87171" }}>{alert.value} kWh</strong>
                        {alert.threshold && <> · Threshold: <strong style={{ color: "#fb923c" }}>{alert.threshold} kWh</strong></>}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => resolve(alert.id)} style={s.resolveBtn}>Resolve</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  layout:    { display: "flex", minHeight: "100vh", background: "#060d1a", fontFamily: "'Segoe UI', sans-serif" },
  main:      { flex: 1, padding: "32px 40px" },
  topBar:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  pageTitle: { color: "#f1f5f9", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSub:   { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  resolveAllBtn: { background: "#4ade80", color: "#052e16", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer" },
  list:      { display: "flex", flexDirection: "column", gap: 14 },
  alertCard: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  alertLeft: { display: "flex", gap: 16, alignItems: "flex-start" },
  typeIcon:  { fontSize: 22, marginTop: 2 },
  alertMsg:  { color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 8 },
  alertMeta: { display: "flex", gap: 12, alignItems: "center", marginBottom: 6 },
  badge:     { padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 },
  metaText:  { color: "#64748b", fontSize: 12 },
  values:    { color: "#94a3b8", fontSize: 13 },
  resolveBtn:{ background: "#1e293b", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  empty:     { color: "#64748b", textAlign: "center", marginTop: 60 },
  emptyBox:  { textAlign: "center", color: "#64748b", marginTop: 80, fontSize: 15 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
};
