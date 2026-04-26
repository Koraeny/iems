import { Link } from "react-router-dom";

const features = [
  { icon: "📊", title: "Real-Time Monitoring",    desc: "Live energy consumption data across all office zones, updated every minute." },
  { icon: "🤖", title: "Anomaly Detection",       desc: "Statistical AI engine flags unusual consumption spikes automatically." },
  { icon: "📈", title: "Predictive Analytics",    desc: "Linear regression forecasts next month's energy usage and cost." },
  { icon: "🔔", title: "Automated Alerts",        desc: "Instant notifications when thresholds are exceeded or anomalies detected." },
  { icon: "🔒", title: "Role-Based Access",       desc: "Separate Administrator and General User roles for secure access." },
  { icon: "⚙️", title: "Auto Control Actions",   desc: "System automatically reduces load during anomaly events." },
];

export default function LandingPage() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logoRow}>
          <span style={s.logoIcon}>⚡</span>
          <span style={s.logoText}>IEMS</span>
        </div>
        <div style={s.headerLinks}>
          <Link to="/login"  style={s.linkBtn}>Login</Link>
          <Link to="/signup" style={s.signupBtn}>Get Started</Link>
        </div>
      </header>

      <section style={s.hero}>
        <div style={s.badge}>Intelligent Energy Management System</div>
        <h1 style={s.h1}>
          Smart Energy Control<br />
          <span style={s.accent}>for Smart Offices</span>
        </h1>
        <p style={s.sub}>
          Monitor, analyse, and optimise your office energy consumption in real time.
          Powered by AI-driven anomaly detection and predictive analytics.
        </p>
        <div style={s.heroActions}>
          <Link to="/signup" style={s.ctaPrimary}>Start Monitoring →</Link>
          <Link to="/login"  style={s.ctaSecondary}>Sign In</Link>
        </div>
      </section>

      <section style={s.features}>
        <h2 style={s.featTitle}>Everything you need</h2>
        <div style={s.grid}>
          {features.map((f) => (
            <div key={f.title} style={s.card}>
              <div style={s.cardIcon}>{f.icon}</div>
              <h3 style={s.cardTitle}>{f.title}</h3>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={s.footer}>
        <p style={s.footerText}>
          IEMS — Intelligent Energy Management System for Smart Offices<br />
          Catholic University of Eastern Africa · Computer Science Final Year Project 2026
        </p>
      </footer>
    </div>
  );
}

const s = {
  page:       { minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Segoe UI', sans-serif" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: "1px solid #1e293b" },
  logoRow:    { display: "flex", alignItems: "center", gap: 8 },
  logoIcon:   { fontSize: 24 },
  logoText:   { color: "#38bdf8", fontWeight: 800, fontSize: 20, letterSpacing: 2 },
  headerLinks:{ display: "flex", gap: 12 },
  linkBtn:    { color: "#94a3b8", textDecoration: "none", padding: "8px 16px", fontSize: 14 },
  signupBtn:  { background: "#38bdf8", color: "#0a0f1e", textDecoration: "none", padding: "8px 20px", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  hero:       { textAlign: "center", padding: "100px 40px 80px" },
  badge:      { display: "inline-block", background: "#1e3a5f", color: "#38bdf8", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 24, letterSpacing: 1 },
  h1:         { fontSize: 52, fontWeight: 800, margin: "0 0 20px", lineHeight: 1.15 },
  accent:     { color: "#38bdf8" },
  sub:        { fontSize: 18, color: "#94a3b8", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 },
  heroActions:{ display: "flex", gap: 16, justifyContent: "center" },
  ctaPrimary: { background: "#38bdf8", color: "#0a0f1e", textDecoration: "none", padding: "14px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16 },
  ctaSecondary:{ background: "transparent", color: "#38bdf8", textDecoration: "none", padding: "14px 32px", borderRadius: 8, fontWeight: 600, fontSize: 16, border: "1.5px solid #38bdf8" },
  features:   { padding: "60px 60px 80px", maxWidth: 1200, margin: "0 auto" },
  featTitle:  { textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48, color: "#f1f5f9" },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 },
  card:       { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 28 },
  cardIcon:   { fontSize: 32, marginBottom: 16 },
  cardTitle:  { fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#f1f5f9" },
  cardDesc:   { fontSize: 14, color: "#64748b", lineHeight: 1.6 },
  footer:     { borderTop: "1px solid #1e293b", padding: "30px 60px", textAlign: "center" },
  footerText: { color: "#475569", fontSize: 13, lineHeight: 2 },
};
