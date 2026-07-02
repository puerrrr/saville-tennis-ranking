import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPlayer(id)
      .then(setPlayer)
      .catch(() => setError("Player not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading player...</div>;
  if (error || !player) return <div className="error">{error || "Not found"}</div>;

  const history = player.rating_history || [];
  const minR = history.length ? Math.min(...history.map((h) => h.rating)) - 0.3 : 4;
  const maxR = history.length ? Math.max(...history.map((h) => h.rating)) + 0.3 : 6;
  const range = maxR - minR || 1;

  return (
    <>
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/players">← Back to players</Link>
      </p>

      <div className="player-header">
        <h2>{player.name}</h2>
        <span className={`rating ${player.is_projected ? "rating-projected" : ""}`}>
          {player.str_rating.toFixed(2)} STR
        </span>
        {player.is_projected && <span className="badge">Projected</span>}
      </div>

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
            {history.map((h, i) => {
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
        <h2>Recent Matches</h2>
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
