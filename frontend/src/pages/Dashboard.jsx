import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";
import { apiStats, apiSimulate, apiPredict, apiHourlyReport, apiDailyReport } from "../utils/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Dashboard() {
  const { token } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [hourly,   setHourly]   = useState([]);
  const [daily,    setDaily]    = useState([]);
  const [predict,  setPredict]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [s, h, d, p] = await Promise.all([
        apiStats(token),
        apiHourlyReport(token),
        apiDailyReport(token, 7),
        apiPredict(token).catch(() => null),
      ]);
      setStats(s);
      setHourly(h.report);
      setDaily(d.report);
      setPredict(p);
      setLastRefresh(new Date());
      setCountdown(30);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const simulate = async () => {
    setSimulating(true);
    try { await apiSimulate(token); await load(); }
    finally { setSimulating(false); }
  };

  const exportPDF = () => {
    const content = `
      <html><head><title>IEMS Energy Report</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;}
      h1{color:#0f172a;}h2{color:#1e3a5f;border-bottom:2px solid #38bdf8;padding-bottom:6px;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;}
      th{background:#0f172a;color:white;padding:10px;text-align:left;}
      td{padding:8px;border-bottom:1px solid #e2e8f0;}
      .stat{display:inline-block;background:#f1f5f9;padding:16px 24px;margin:8px;border-radius:8px;min-width:150px;}
      .stat-val{font-size:28px;font-weight:bold;color:#38bdf8;}
      .stat-label{font-size:12px;color:#64748b;}</style></head>
      <body>
      <h1>⚡ IEMS Energy Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | CUEA Smart Office System</p>
      <h2>24-Hour Summary</h2>
      <div>
        <div class="stat"><div class="stat-val">${stats?.total_usage_kwh ?? 0}</div><div class="stat-label">Total Usage (kWh)</div></div>
        <div class="stat"><div class="stat-val">${stats?.peak_load_kwh ?? 0}</div><div class="stat-label">Peak Load (kWh)</div></div>
        <div class="stat"><div class="stat-val">${stats?.active_alerts ?? 0}</div><div class="stat-label">Active Alerts</div></div>
        <div class="stat"><div class="stat-val">${stats?.auto_actions ?? 0}</div><div class="stat-label">Auto Actions</div></div>
      </div>
      <h2>AI Prediction — Next Month</h2>
      ${predict && !predict.error ? `
        <div>
          <div class="stat"><div class="stat-val">${predict.predicted_kwh_next_month}</div><div class="stat-label">Predicted kWh</div></div>
          <div class="stat"><div class="stat-val">KES ${predict.estimated_cost_kes?.toLocaleString()}</div><div class="stat-label">Estimated Cost</div></div>
          <div class="stat"><div class="stat-val">${(predict.model?.r_squared * 100).toFixed(1)}%</div><div class="stat-label">Model Accuracy (R²)</div></div>
        </div>` : '<p>Not enough data for prediction.</p>'}
      <h2>Zone Breakdown (24h)</h2>
      <table><tr><th>Zone</th><th>Total (kWh)</th><th>Peak (kWh)</th><th>Readings</th></tr>
      ${(stats?.zone_stats || []).map(z => `<tr><td>${z.zone}</td><td>${z.total_kwh}</td><td>${z.peak_kwh}</td><td>${z.readings_count}</td></tr>`).join("")}
      </table>
      <h2>Daily Consumption (Last 7 Days)</h2>
      <table><tr><th>Date</th><th>Total (kWh)</th></tr>
      ${daily.map(d => `<tr><td>${d.date}</td><td>${d.total_kwh}</td></tr>`).join("")}
      </table>
      </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(content);
    w.document.close();
    w.print();
  };

  if (loading) return (
    <div style={s.layout}><Sidebar /><main style={s.main}><div style={s.loading}>Loading dashboard…</div></main></div>
  );

  const statCards = [
    { label: "Total Usage (24h)",  value: `${stats?.total_usage_kwh ?? 0} kWh`, icon: "⚡", color: "#38bdf8" },
    { label: "Peak Load",          value: `${stats?.peak_load_kwh ?? 0} kWh`,   icon: "📈", color: "#fb923c" },
    { label: "Active Alerts",      value: stats?.active_alerts ?? 0,             icon: "🔔", color: "#f87171" },
    { label: "Auto Actions (24h)", value: stats?.auto_actions ?? 0,              icon: "🤖", color: "#4ade80" },
  ];

  return (
    <div style={s.layout}>
      <Sidebar />
      <main style={s.main}>
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Dashboard</h1>
            <p style={s.pageSub}>
              Last refreshed: {lastRefresh.toLocaleTimeString()} · Auto-refresh in {countdown}s
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={exportPDF} style={s.exportBtn}>📄 Export Report</button>
            <button onClick={simulate} style={s.simBtn} disabled={simulating}>
              {simulating ? "⏳ Simulating…" : "▶ Run Simulation"}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={s.cardRow}>
          {statCards.map(c => (
            <div key={c.label} style={s.statCard}>
              <div style={{ fontSize:24, marginBottom:12, color:c.color }}>{c.icon}</div>
              <div style={{ fontSize:28, fontWeight:800, marginBottom:6, color:c.color }}>{c.value}</div>
              <div style={{ color:"#64748b", fontSize:12 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Hourly Chart */}
        <div style={s.chartBox}>
          <h2 style={s.sectionTitle}>Hourly Energy Consumption (Last 24h)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourly} margin={{ top:5, right:20, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize:11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize:11 }} unit=" kWh" />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0" }} />
              <Bar dataKey="total_kwh" name="kWh" fill="#38bdf8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Chart */}
        <div style={s.chartBox}>
          <h2 style={s.sectionTitle}>Daily Consumption — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily} margin={{ top:5, right:20, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize:10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize:11 }} unit=" kWh" />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0" }} />
              <Line type="monotone" dataKey="total_kwh" stroke="#fb923c" strokeWidth={2} dot={{ fill:"#fb923c" }} name="Total kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Breakdown */}
        {stats?.zone_stats && (
          <div style={s.chartBox}>
            <h2 style={s.sectionTitle}>Energy by Zone (24h)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.zone_stats} layout="vertical" margin={{ left:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize:11 }} unit=" kWh" />
                <YAxis type="category" dataKey="zone" stroke="#64748b" tick={{ fontSize:11 }} width={100} />
                <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0" }} />
                <Bar dataKey="total_kwh" name="Total kWh" fill="#818cf8" radius={[0,4,4,0]} />
                <Bar dataKey="peak_kwh"  name="Peak kWh"  fill="#fb923c" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Prediction */}
        {predict && !predict.error && (
          <div style={s.predictBox}>
            <h2 style={s.sectionTitle}>📈 AI Prediction — Next Month</h2>
            <div style={s.predictGrid}>
              <div style={s.predictCard}>
                <div style={{ fontSize:24, fontWeight:800, color:"#38bdf8", marginBottom:6 }}>{predict.predicted_kwh_next_month} kWh</div>
                <div style={{ color:"#64748b", fontSize:12 }}>Predicted Consumption</div>
              </div>
              <div style={s.predictCard}>
                <div style={{ fontSize:24, fontWeight:800, color:"#4ade80", marginBottom:6 }}>KES {predict.estimated_cost_kes?.toLocaleString()}</div>
                <div style={{ color:"#64748b", fontSize:12 }}>Estimated Cost</div>
              </div>
              <div style={s.predictCard}>
                <div style={{ fontSize:24, fontWeight:800, color:"#fb923c", marginBottom:6 }}>{(predict.model?.r_squared * 100).toFixed(1)}%</div>
                <div style={{ color:"#64748b", fontSize:12 }}>Model Accuracy (R²)</div>
              </div>
            </div>
            <p style={{ color:"#475569", fontSize:12, margin:0 }}>
              Based on Linear Regression trained on {predict.model?.data_points} daily readings. Rate: KES {predict.rate_kes_per_kwh}/kWh.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  layout:      { display:"flex", minHeight:"100vh", background:"#060d1a", fontFamily:"'Segoe UI',sans-serif" },
  main:        { flex:1, padding:"32px 40px", overflowY:"auto" },
  loading:     { color:"#64748b", fontSize:16, marginTop:60, textAlign:"center" },
  topBar:      { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 },
  pageTitle:   { color:"#f1f5f9", fontSize:26, fontWeight:700, margin:0 },
  pageSub:     { color:"#64748b", fontSize:12, margin:"4px 0 0" },
  simBtn:      { background:"#38bdf8", color:"#0a0f1e", border:"none", borderRadius:8, padding:"10px 22px", fontWeight:700, fontSize:14, cursor:"pointer" },
  exportBtn:   { background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155", borderRadius:8, padding:"10px 18px", fontWeight:600, fontSize:14, cursor:"pointer" },
  cardRow:     { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, marginBottom:28 },
  statCard:    { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:"24px 20px" },
  chartBox:    { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24, marginBottom:24 },
  sectionTitle:{ color:"#e2e8f0", fontSize:16, fontWeight:600, marginTop:0, marginBottom:20 },
  predictBox:  { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24, marginBottom:24 },
  predictGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:16 },
  predictCard: { background:"#1e293b", borderRadius:10, padding:"20px 16px", textAlign:"center" },
};
