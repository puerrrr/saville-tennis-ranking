import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getLeaderboard(), api.getMatches()])
      .then(([lb, m]) => {
        setLeaderboard(lb.slice(0, 5));
        setMatches(m.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <div className="hero-stats">
        <div className="stat">
          <div className="stat-value">{leaderboard.length > 0 ? leaderboard.length : "—"}</div>
          <div className="stat-label">Top players shown</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {leaderboard[0] ? leaderboard[0].str_rating.toFixed(2) : "—"}
          </div>
          <div className="stat-label">Club leader STR</div>
        </div>
        <div className="stat">
          <div className="stat-value">{matches.length}</div>
          <div className="stat-label">Recent matches</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Top Rankings</h2>
          {leaderboard.length === 0 ? (
            <div className="empty-state">
              No players yet. <Link to="/players">Add players</Link> to get started.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>STR</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className={`rank-badge rank-${p.rank}`}>{p.rank}</span>
                    </td>
                    <td>
                      <Link to={`/players/${p.id}`}>{p.name}</Link>
                      {p.is_projected && <span className="badge">P</span>}
                    </td>
                    <td>
                      <span className={`rating ${p.is_projected ? "rating-projected" : ""}`}>
                        {p.str_rating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: "1rem" }}>
            <Link to="/leaderboard">View full rankings →</Link>
          </p>
        </div>

        <div className="card">
          <h2>Recent Matches</h2>
          {matches.length === 0 ? (
            <div className="empty-state">
              No matches recorded. <Link to="/record">Record a match</Link>.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const p1Won = m.player1_games > m.player2_games;
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className={p1Won ? "winner" : ""}>{m.player1_name}</span>
                        {" vs "}
                        <span className={!p1Won ? "winner" : ""}>{m.player2_name}</span>
                      </td>
                      <td className="match-score">
                        {m.player1_games}–{m.player2_games}
                      </td>
                      <td>{new Date(m.played_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card how-it-works">
        <h2>How STR Works</h2>
        <p>
          Saville Tennis Ranking (STR) uses a UTR-inspired algorithm. Your rating reflects
          how many games you win relative to expectation — not just whether you won the match.
        </p>
        <ul>
          <li>Ratings scale from 1.00 to 16.50 (same range as UTR)</li>
          <li>Each match produces a match rating based on game-win percentage</li>
          <li>Your STR is a weighted average of your last 30 matches (12 months)</li>
          <li>Ratings show (P) until you have 5+ matches — then they become reliable</li>
        </ul>
      </div>
    </>
  );
}
