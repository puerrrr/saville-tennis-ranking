import { useEffect, useState } from "react";
import { api } from "../api";

const FORMATS = [
  { value: "single_set", label: "Single set" },
  { value: "pro_set", label: "Pro set (8-game)" },
  { value: "best_of_3", label: "Best of 3 sets" },
  { value: "best_of_5", label: "Best of 5 sets" },
];

export default function RecordMatch() {
  const [players, setPlayers] = useState([]);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [format, setFormat] = useState("best_of_3");
  const [sets, setSets] = useState([{ player1_games: 6, player2_games: 4 }]);
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getPlayers().then(setPlayers);
  }, []);

  const p1 = players.find((p) => String(p.id) === player1Id);
  const p2 = players.find((p) => String(p.id) === player2Id);

  function addSet() {
    setSets([...sets, { player1_games: 0, player2_games: 0 }]);
  }

  function removeSet(index) {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== index));
  }

  function updateSet(index, field, value) {
    const next = [...sets];
    next[index] = { ...next[index], [field]: parseInt(value, 10) || 0 };
    setSets(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!player1Id || !player2Id) {
      setError("Select both players.");
      return;
    }
    if (player1Id === player2Id) {
      setError("Players must be different.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        player1_id: parseInt(player1Id, 10),
        player2_id: parseInt(player2Id, 10),
        sets,
        match_format: format,
        notes: notes || null,
        recorded_by: recordedBy || null,
      };
      if (playedAt) {
        payload.played_at = new Date(playedAt).toISOString();
      }
      await api.createMatch(payload);
      setSuccess("Match recorded! Rankings will update automatically.");
      setSets([{ player1_games: 6, player2_games: 4 }]);
      setNotes("");
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Failed to record match");
    } finally {
      setSubmitting(false);
    }
  }

  const total1 = sets.reduce((s, set) => s + set.player1_games, 0);
  const total2 = sets.reduce((s, set) => s + set.player2_games, 0);

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Record a Match</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
        Enter games per set. STR uses total games won — a close loss can still raise your rating.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label>Player 1</label>
            <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} required>
              <option value="">Select player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.str_rating.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Player 2</label>
            <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} required>
              <option value="">Select player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.str_rating.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Match format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Set scores (games won per set)</label>
          <div className="set-row" style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            <span>Set</span>
            <span>{p1?.name?.split(" ")[0] || "P1"}</span>
            <span>{p2?.name?.split(" ")[0] || "P2"}</span>
            <span></span>
          </div>
          {sets.map((set, i) => (
            <div className="set-row" key={i}>
              <span>Set {i + 1}</span>
              <input
                type="number"
                min="0"
                max="20"
                value={set.player1_games}
                onChange={(e) => updateSet(i, "player1_games", e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="20"
                value={set.player2_games}
                onChange={(e) => updateSet(i, "player2_games", e.target.value)}
              />
              <button type="button" className="secondary" onClick={() => removeSet(i)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={addSet} style={{ marginTop: "0.5rem" }}>
            + Add set
          </button>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Total games: <strong>{total1}–{total2}</strong>
          </p>
        </div>

        <div className="form-group">
          <label>Match date (optional)</label>
          <input
            type="datetime-local"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Recorded by (optional)</label>
          <input
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Club ladder, friendly, tournament..."
          />
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <button type="submit" disabled={submitting || players.length < 2}>
          {submitting ? "Saving..." : "Record Match"}
        </button>
      </form>
    </div>
  );
}
