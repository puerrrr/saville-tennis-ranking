import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [initialRating, setInitialRating] = useState("5.0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.getPlayers().then(setPlayers).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createPlayer({
        name: name.trim(),
        email: email.trim() || null,
        initial_rating: parseFloat(initialRating) || 5.0,
      });
      setName("");
      setEmail("");
      setInitialRating("5.0");
      load();
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Failed to add player");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading">Loading players...</div>;

  return (
    <div className="grid-2">
      <div className="card">
        <h2>Register Player</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Chen"
              required
            />
          </div>
          <div className="form-group">
            <label>Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
            />
          </div>
          <div className="form-group">
            <label>Starting STR (1.00–16.50)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              max="16.5"
              value={initialRating}
              onChange={(e) => setInitialRating(e.target.value)}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Player"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>All Players ({players.length})</h2>
        {players.length === 0 ? (
          <div className="empty-state">No players registered yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>STR</th>
                <th>Matches</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/players/${p.id}`}>{p.name}</Link>
                    {p.is_projected && <span className="badge">P</span>}
                  </td>
                  <td>
                    <span className={`rating ${p.is_projected ? "rating-projected" : ""}`}>
                      {p.str_rating.toFixed(2)}
                    </span>
                  </td>
                  <td>{p.match_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
