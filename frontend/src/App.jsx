import { useState, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import DevicesPage from "./pages/DevicesPage";
import UsersPage from "./pages/UsersPage";

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("iems_token"));
  const [user, setUser]   = useState(JSON.parse(localStorage.getItem("iems_user") || "null"));

  const login = (tok, usr) => {
    localStorage.setItem("iems_token", tok);
    localStorage.setItem("iems_user", JSON.stringify(usr));
    setToken(tok); setUser(usr);
  };
  const logout = () => {
    localStorage.removeItem("iems_token");
    localStorage.removeItem("iems_user");
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/signup"    element={<SignUp />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/devices"   element={<PrivateRoute><DevicesPage /></PrivateRoute>} />
          <Route path="/alerts"    element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
          <Route path="/users"     element={<PrivateRoute><UsersPage /></PrivateRoute>} />
          <Route path="/settings"  element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
