import { Routes, Route, Link } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";
import AgentDetail from "./pages/AgentDetail";
import Compare from "./pages/Compare";

function App() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <nav
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #334155",
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <Link to="/" style={{ fontWeight: 700, color: "#f8fafc" }}>
          WSOA
        </Link>
        <Link to="/">Leaderboard</Link>
        <Link to="/compare">Compare</Link>
      </nav>
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/agent/:signature" element={<AgentDetail />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
