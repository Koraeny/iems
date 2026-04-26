const BASE = "http://localhost:5000/api";

function headers(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const apiLogin    = (email, password) => request("POST", "/auth/login", { email, password });
export const apiRegister = (name, email, password, role) => request("POST", "/auth/register", { name, email, password, role });
export const apiStats    = (token) => request("GET", "/energy/stats", null, token);
export const apiReadings = (token, hours = 24) => request("GET", `/energy/readings?hours=${hours}`, null, token);
export const apiZones    = (token) => request("GET", "/energy/zones", null, token);
export const apiSimulate = (token) => request("POST", "/energy/simulate", {}, token);
export const apiPredict  = (token) => request("GET", "/energy/predict", null, token);
export const apiDailyReport  = (token, days = 7) => request("GET", `/reports/daily?days=${days}`, null, token);
export const apiHourlyReport = (token) => request("GET", "/reports/hourly", null, token);
export const apiAlerts       = (token) => request("GET", "/alerts/", null, token);
export const apiResolveAlert = (token, id) => request("PATCH", `/alerts/${id}/resolve`, {}, token);
export const apiResolveAll   = (token) => request("PATCH", "/alerts/resolve-all", {}, token);
export const apiGetSettings    = (token) => request("GET", "/settings/", null, token);
export const apiUpdateSettings = (token, data) => request("POST", "/settings/", data, token);
export const apiGetDevices    = (token, zone_id) => request("GET", `/devices/${zone_id ? `?zone_id=${zone_id}` : ''}`, null, token);
export const apiToggleDevice  = (token, id, action, reason) => request("PATCH", `/devices/${id}/toggle`, { action, reason }, token);
export const apiZoneOff       = (token, zone_id, reason) => request("PATCH", `/devices/zone/${zone_id}/off`, { reason, triggered_by: 'manual' }, token);
export const apiZoneOn        = (token, zone_id, reason) => request("PATCH", `/devices/zone/${zone_id}/on`, { reason }, token);
export const apiDeviceLogs    = (token) => request("GET", "/devices/logs", null, token);
export const apiDeviceSummary = (token) => request("GET", "/devices/summary", null, token);
