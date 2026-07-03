const PRODUCTION_API = "https://str-api-m4ju.onrender.com/api";

function getApiBase() {
  if (typeof window !== "undefined") {
    if (window.__STR_CONFIG__?.apiUrl) {
      return window.__STR_CONFIG__.apiUrl.replace(/\/$/, "");
    }
    if (window.location.hostname.endsWith(".pages.dev")) {
      return PRODUCTION_API;
    }
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  return "/api";
}

function formatError(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }
  return "Request failed";
}

async function request(path, options = {}) {
  const api = getApiBase();
  let res;
  try {
    res = await fetch(`${api}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error(
      `Cannot reach the API at ${api}. The backend may be waking up (free tier takes ~50s). Try again.`
    );
  }
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatError(err.detail));
  }
  return res.json();
}

export const api = {
  getApiBase,
  getPlayers: () => request("/players"),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (data) =>
    request("/players", { method: "POST", body: JSON.stringify(data) }),
  getLeaderboard: () => request("/leaderboard"),
  getMatches: () => request("/matches"),
  createMatch: (data) =>
    request("/matches", { method: "POST", body: JSON.stringify(data) }),
  health: () => request("/health"),
  updatePlayer: (id, data) =>
    request(`/players/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlayer: (id) => request(`/players/${id}`, { method: "DELETE" }),
  getMatch: (id) => request(`/matches/${id}`),
  updateMatch: (id, data) =>
    request(`/matches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMatch: (id) => request(`/matches/${id}`, { method: "DELETE" }),
};
