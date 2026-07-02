const API = import.meta.env.VITE_API_URL || "/api";

function formatError(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }
  return "Request failed";
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatError(err.detail));
  }
  return res.json();
}

export const api = {
  getPlayers: () => request("/players"),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (data) =>
    request("/players", { method: "POST", body: JSON.stringify(data) }),
  getLeaderboard: () => request("/leaderboard"),
  getMatches: () => request("/matches"),
  createMatch: (data) =>
    request("/matches", { method: "POST", body: JSON.stringify(data) }),
  health: () => request("/health"),
};
