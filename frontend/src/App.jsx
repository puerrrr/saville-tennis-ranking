import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import RecordMatch from "./pages/RecordMatch";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import WakeBanner from "./WakeBanner";

export default function App() {
  return (
    <div className="app-shell">
      <WakeBanner />
      <header>
        <div className="logo">
          <h1>Saville Tennis Ranking</h1>
          <span>Local club · STR</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Home
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Rankings
          </NavLink>
          <NavLink to="/record" className={({ isActive }) => (isActive ? "active" : "")}>
            Record Match
          </NavLink>
          <NavLink to="/players" className={({ isActive }) => (isActive ? "active" : "")}>
            Players
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/record" element={<RecordMatch />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerDetail />} />
      </Routes>
    </div>
  );
}
