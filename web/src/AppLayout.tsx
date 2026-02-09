import { Routes, Route, Link, Outlet } from "react-router-dom";
import Dither from "./components/Dither";

export default function AppLayout() {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <Dither
          waveColor={[0.25, 0.25, 0.25]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0}
          colorNum={4.6}
          waveAmplitude={0.3}
          waveFrequency={5.8}
          waveSpeed={0.04}
        />
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <nav
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid rgba(51, 65, 85, 0.6)",
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
          }}
        >
          <Link to="/" style={{ fontWeight: 700, color: "#f8fafc" }}>
            WSOA
          </Link>
          <Link to="/app" style={{ color: "#e2e8f0" }}>
            Leaderboard
          </Link>
          <Link to="/app/compare" style={{ color: "#e2e8f0" }}>
            Compare
          </Link>
        </nav>
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
