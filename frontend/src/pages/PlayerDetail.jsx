import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const FORMATS = [
  { value: "single_set", label: "Single set" },
  { value: "pro_set", label: "Pro set" },
  { value: "best_of_3", label: "Best of 3" },
  { value: "best_of_5", label: "Best of 5" },
];

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [initialRating, setInitialRating] = useState("5.0");
  const [savingProfile, setSavingProfile] = useState(false);

  const [editingMatch, setEditingMatch] = useState(null);
  const [matchForm, setMatchForm] = useState({});
  const [savingMatch, setSavingMatch] = useState(false);

  function load() {
    setLoading(true);
    return api
      .getPlayer(id)
      .then((data) => {
        setPlayer(data);
        setName(data.name);
        setEmail(data.email || "");
        setInitialRating(String(data.initial_rating ?? data.str_rating));
        setError("");
      })
      .catch(() => setError("Player not found"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");
    try {
      await api.updatePlayer(id, {
        name: name.trim(),
        email: email.trim() || null,
        initial_rating: parseFloat(initialRating) || 5.0,
      });
      setEditingProfile(false);
      setMessage("Profile updated.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function deletePlayer() {
    if (!window.confirm(`Delete ${player.name}? This only works if they have no matches.`)) return;
    try {
      await api.deletePlayer(id);
      navigate("/players");
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditMatch(m) {
    setEditingMatch(m.id);
    setMatchForm({
      player1_games: m.player1_games,
      player2_games: m.player2_games,
      match_format: m.match_format,
      played_at: toDatetimeLocal(m.played_at),
      notes: m.notes || "",
    });
    setMessage("");
    setError("");
  }

  async function saveMatch(e) {
    e.preventDefault();
    setSavingMatch(true);
    setError("");
    try {
      const payload = {
        player1_games: parseInt(matchForm.player1_games, 10) || 0,
        player2_games: parseInt(matchForm.player2_games, 10) || 0,
        match_format: matchForm.match_format,
        notes: matchForm.notes || null,
      };
      if (matchForm.played_at) {
        payload.played_at = new Date(matchForm.played_at).toISOString();
      }
      await api.updateMatch(editingMatch, payload);
      setEditingMatch(null);
      setMessage("Match updated. Rankings recalculated.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMatch(false);
    }
  }

  async function deleteMatch(matchId) {
    if (!window.confirm("Delete this match? Rankings will be recalculated.")) return;
    try {
      await api.deleteMatch(matchId);
      setMessage("Match deleted.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loading">Loading player...</div>;
  if (error && !player) return <div className="error">{error}</div>;
  if (!player) return <div className="error">Not found</div>;

  const history = player.rating_history || [];
  const minR = history.length ? Math.min(...history.map((h) => h.rating)) - 0.3 : 4;
  const maxR = history.length ? Math.max(...history.map((h) => h.rating)) + 0.3 : 6;
  const range = maxR - minR || 1;

  return (
    <>
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/players">← Back to players</Link>
      </p>

      {message && <div className="success" style={{ marginBottom: "1rem" }}>{message}</div>}
      {error && player && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="player-header">
        <h2>{player.name}</h2>
        <span className={`rating ${player.is_projected ? "rating-projected" : ""}`}>
          {player.str_rating.toFixed(2)} STR
        </span>
        {player.is_projected && <span className="badge">Projected</span>}
        <button type="button" className="secondary" onClick={() => setEditingProfile((v) => !v)}>
          {editingProfile ? "Cancel" : "Edit profile"}
        </button>
      </div>

      {editingProfile && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h2>Edit Profile</h2>
          <form onSubmit={saveProfile}>
            <div className="grid-2">
              <div className="form-group">
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Starting STR (used before enough match history)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="16.5"
                value={initialRating}
                onChange={(e) => setInitialRating(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
              <button type="button" className="secondary danger-btn" onClick={deletePlayer}>
                Delete player
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="hero-stats">
        <div className="stat">
          <div className="stat-value">{player.match_count}</div>
          <div className="stat-label">Matches counted</div>
        </div>
        <div className="stat">
          <div className="stat-value">{player.is_projected ? "P" : "✓"}</div>
          <div className="stat-label">{player.is_projected ? "Projected rating" : "Reliable rating"}</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {history.length > 0 ? history[history.length - 1].rating.toFixed(2) : "—"}
          </div>
          <div className="stat-label">Latest match rating</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h2>Rating History</h2>
          <div className="history-chart">
            {history.map((h) => {
              const height = ((h.rating - minR) / range) * 100;
              return (
                <div
                  key={h.match_id}
                  className="history-bar"
                  style={{ height: `${Math.max(8, height)}%` }}
                  data-label={`${h.rating.toFixed(2)} · ${new Date(h.date).toLocaleDateString()}`}
                  title={`${h.rating.toFixed(2)} on ${new Date(h.date).toLocaleDateString()}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Match History</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Click <strong>Edit</strong> to fix scores or dates. Rankings update automatically.
        </p>
        {player.recent_matches.length === 0 ? (
          <div className="empty-state">No matches yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Score</th>
                <th>Match rating</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {player.recent_matches.map((m) => {
                const isP1 = m.player1_id === player.id;
                const opponent = isP1 ? m.player2_name : m.player1_name;
                const myGames = isP1 ? m.player1_games : m.player2_games;
                const oppGames = isP1 ? m.player2_games : m.player1_games;
                const matchRating = isP1 ? m.player1_match_rating : m.player2_match_rating;
                const won = myGames > oppGames;

                if (editingMatch === m.id) {
                  return (
                    <tr key={m.id}>
                      <td colSpan={5}>
                        <form onSubmit={saveMatch} className="match-edit-form">
                          <p style={{ marginBottom: "0.75rem" }}>
                            <strong>{m.player1_name}</strong> vs <strong>{m.player2_name}</strong>
                          </p>
                          <div className="match-edit-grid">
                            <div className="form-group">
                              <label>{m.player1_name} games</label>
                              <input
                                type="number"
                                min="0"
                                value={matchForm.player1_games}
                                onChange={(e) =>
                                  setMatchForm({ ...matchForm, player1_games: e.target.value })
                                }
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>{m.player2_name} games</label>
                              <input
                                type="number"
                                min="0"
                                value={matchForm.player2_games}
                                onChange={(e) =>
                                  setMatchForm({ ...matchForm, player2_games: e.target.value })
                                }
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Format</label>
                              <select
                                value={matchForm.match_format}
                                onChange={(e) =>
                                  setMatchForm({ ...matchForm, match_format: e.target.value })
                                }
                              >
                                {FORMATS.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Date</label>
                              <input
                                type="datetime-local"
                                value={matchForm.played_at}
                                onChange={(e) =>
                                  setMatchForm({ ...matchForm, played_at: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Notes</label>
                            <input
                              value={matchForm.notes}
                              onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="submit" disabled={savingMatch}>
                              {savingMatch ? "Saving..." : "Save match"}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setEditingMatch(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={m.id}>
                    <td>{opponent}</td>
                    <td className="match-score">
                      <span className={won ? "winner" : ""}>
                        {myGames}–{oppGames}
                      </span>
                    </td>
                    <td>{matchRating != null ? matchRating.toFixed(2) : "—"}</td>
                    <td>{new Date(m.played_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button type="button" className="secondary btn-sm" onClick={() => startEditMatch(m)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary btn-sm danger-btn"
                        onClick={() => deleteMatch(m.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
