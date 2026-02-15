import { Link, Outlet } from "react-router-dom";
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
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
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
            padding: "0.75rem 0",
            borderBottom: "1px solid #222",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 960,
            width: "100%",
            margin: "0 auto",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem",
          }}
        >
          <Link
            to="/"
            style={{
              fontWeight: 500,
              color: "#ddd",
              fontSize: "0.85rem",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            WSOA
          </Link>
          <div
            style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}
          >
            <Link
              to="/app"
              style={{
                color: "#777",
                fontSize: "0.78rem",
                fontWeight: 300,
                textDecoration: "none",
              }}
            >
              Leaderboard
            </Link>
            <Link
              to="/app/compare"
              style={{
                color: "#777",
                fontSize: "0.78rem",
                fontWeight: 300,
                textDecoration: "none",
              }}
            >
              Compare
            </Link>
          </div>
        </nav>
        <main
          style={{
            flex: 1,
            maxWidth: 960,
            width: "100%",
            margin: "0 auto",
            padding: "1.5rem",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
