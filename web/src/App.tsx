import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import AppLayout from "./AppLayout";
import Leaderboard from "./pages/Leaderboard";
import AgentDetail from "./pages/AgentDetail";
import Compare from "./pages/Compare";
import Monad from "./pages/Monad";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Leaderboard />} />
        <Route path="compare" element={<Compare />} />
        <Route path="monad" element={<Monad />} />
        <Route path="agent/:signature" element={<AgentDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
