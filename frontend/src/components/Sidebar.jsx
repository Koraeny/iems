import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../App";

const nav = [
  { path: "/dashboard", label: "Dashboard",  icon: "⚡" },
  { path: "/devices",   label: "Devices",    icon: "🔌" },
  { path: "/alerts",    label: "Alerts",     icon: "🔔" },
  { path: "/users",     label: "Users",      icon: "👥" },
  { path: "/settings",  label: "Settings",   icon: "⚙️" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  return (
    <aside style={st.sidebar}>
      <div style={st.logo}>
        <span style={{fontSize:28}}>⚡</span>
        <div>
          <div style={st.logoTitle}>IEMS</div>
          <div style={st.logoSub}>Energy Management</div>
        </div>
      </div>
      <nav style={st.nav}>
        {nav.map(({ path, label, icon }) => (
          <Link key={path} to={path} style={{ ...st.link, ...(pathname === path ? st.active : {}) }}>
            <span>{icon}</span><span>{label}</span>
          </Link>
        ))}
      </nav>
      <div style={st.footer}>
        <div style={st.userInfo}>
          <div style={st.avatar}>{user?.name?.[0] ?? "U"}</div>
          <div>
            <div style={st.userName}>{user?.name}</div>
            <div style={st.userRole}>{user?.role?.replace("_"," ")}</div>
          </div>
        </div>
        <button onClick={logout} style={st.logout}>Logout</button>
      </div>
    </aside>
  );
}

const st = {
  sidebar:  { width:240, minHeight:"100vh", background:"#0f172a", display:"flex", flexDirection:"column", padding:"24px 0", boxShadow:"2px 0 12px rgba(0,0,0,0.3)" },
  logo:     { display:"flex", alignItems:"center", gap:12, padding:"0 24px 32px", borderBottom:"1px solid #1e293b" },
  logoTitle:{ color:"#38bdf8", fontWeight:700, fontSize:18 },
  logoSub:  { color:"#64748b", fontSize:11 },
  nav:      { flex:1, padding:"24px 12px", display:"flex", flexDirection:"column", gap:4 },
  link:     { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, color:"#94a3b8", textDecoration:"none", fontSize:14, fontWeight:500 },
  active:   { background:"#1e3a5f", color:"#38bdf8" },
  footer:   { padding:"16px 24px", borderTop:"1px solid #1e293b" },
  userInfo: { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  avatar:   { width:36, height:36, borderRadius:"50%", background:"#38bdf8", color:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 },
  userName: { color:"#e2e8f0", fontSize:13, fontWeight:600 },
  userRole: { color:"#64748b", fontSize:11, textTransform:"capitalize" },
  logout:   { width:"100%", padding:"8px", background:"#1e293b", color:"#f87171", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:500 },
};
