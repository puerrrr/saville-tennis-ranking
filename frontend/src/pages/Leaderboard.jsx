import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading rankings...</div>;

  return (
    <div className="card">
      <h2>Club Rankings</h2>
      {entries.length === 0 ? (
        <div className="empty-state">
          No players yet. <Link to="/players">Register players</Link> first.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>STR</th>
              <th>Matches</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className={`rank-badge ${e.rank <= 3 ? `rank-${e.rank}` : ""}`}>
                    {e.rank}
                  </span>
                </td>
                <td>
                  <Link to={`/players/${e.id}`}>{e.name}</Link>
                </td>
                <td>
                  <span className={`rating ${e.is_projected ? "rating-projected" : ""}`}>
                    {e.str_rating.toFixed(2)}
                  </span>
                </td>
                <td>{e.match_count}</td>
                <td>{e.is_projected ? "Projected (P)" : "Reliable"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
