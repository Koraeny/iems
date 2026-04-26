import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiLogin } from "../utils/api";
import { useAuth } from "../App";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(form.email, form.password);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚡ IEMS</div>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.sub}>Sign in to your account</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="admin@iems.ac.ke"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account? <Link to="/signup" style={s.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  card:  { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "48px 40px", width: 380 },
  logo:  { color: "#38bdf8", fontWeight: 800, fontSize: 22, marginBottom: 24 },
  title: { color: "#f1f5f9", fontSize: 26, fontWeight: 700, margin: "0 0 6px" },
  sub:   { color: "#64748b", fontSize: 14, margin: "0 0 28px" },
  error: { background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 },
  label: { display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 500, marginBottom: 6 },
  input: { display: "block", width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none" },
  btn:   { width: "100%", background: "#38bdf8", color: "#0a0f1e", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 },
  footer:{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 24 },
  link:  { color: "#38bdf8", textDecoration: "none" },
};
