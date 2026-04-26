import { useState, useEffect } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";

const BASE = "http://localhost:5000/api";

export default function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "general_user" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const isAdmin = user?.role === "administrator";

  const load = async () => {
    const res = await fetch(`${BASE}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setMsg(`User ${form.name} created successfully.`);
    setForm({ name: "", email: "", password: "", role: "general_user" });
    load();
  };

  return (
    <div style={s.layout}>
      <Sidebar />
      <main style={s.main}>
        <h1 style={s.title}>User Management</h1>
        <p style={s.sub}>Manage system users and access roles</p>

        {!isAdmin && <div style={s.warn}>⚠️ Only administrators can manage users.</div>}

        {isAdmin && (
          <div style={s.formBox}>
            <h2 style={s.sectionTitle}>Add New User</h2>
            {msg && <div style={s.success}>{msg}</div>}
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={addUser} style={s.form}>
              <input style={s.input} placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <input style={s.input} placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <input style={s.input} placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              <select style={s.input} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="general_user">General User</option>
                <option value="administrator">Administrator</option>
              </select>
              <button style={s.btn} type="submit">Add User</button>
            </form>
          </div>
        )}

        <div style={s.tableBox}>
          <h2 style={s.sectionTitle}>All Users ({users.length})</h2>
          {loading ? <p style={{color:"#64748b"}}>Loading...</p> : (
            <table style={s.table}>
              <thead>
                <tr>{["Name","Email","Role","Joined"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>{u.name}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>
                      <span style={{...s.badge, background: u.role === "administrator" ? "#1e3a5f" : "#1e293b", color: u.role === "administrator" ? "#38bdf8" : "#94a3b8"}}>
                        {u.role.replace("_"," ")}
                      </span>
                    </td>
                    <td style={s.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

const s = {
  layout: { display:"flex", minHeight:"100vh", background:"#060d1a", fontFamily:"'Segoe UI',sans-serif" },
  main:   { flex:1, padding:"32px 40px" },
  title:  { color:"#f1f5f9", fontSize:26, fontWeight:700, margin:0 },
  sub:    { color:"#64748b", fontSize:13, margin:"4px 0 24px" },
  warn:   { background:"#451a03", color:"#fb923c", border:"1px solid #7c2d12", padding:"12px 16px", borderRadius:8, marginBottom:20, fontSize:13 },
  formBox:{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24, marginBottom:24 },
  sectionTitle: { color:"#e2e8f0", fontSize:16, fontWeight:600, margin:"0 0 16px" },
  form:   { display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" },
  input:  { background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#f1f5f9", fontSize:14, minWidth:160 },
  btn:    { background:"#38bdf8", color:"#0a0f1e", border:"none", borderRadius:8, padding:"10px 22px", fontWeight:700, cursor:"pointer", fontSize:14 },
  success:{ background:"#052e16", color:"#4ade80", border:"1px solid #166534", padding:"10px 14px", borderRadius:6, marginBottom:12, fontSize:13 },
  error:  { background:"#450a0a", color:"#f87171", border:"1px solid #7f1d1d", padding:"10px 14px", borderRadius:6, marginBottom:12, fontSize:13 },
  tableBox:{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24 },
  table:  { width:"100%", borderCollapse:"collapse" },
  th:     { background:"#1e293b", color:"#94a3b8", padding:"10px 12px", fontSize:12, fontWeight:600, textAlign:"left", borderBottom:"1px solid #334155" },
  tr:     { borderBottom:"1px solid #1e293b" },
  td:     { color:"#e2e8f0", padding:"10px 12px", fontSize:13 },
  badge:  { padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:600 },
};
