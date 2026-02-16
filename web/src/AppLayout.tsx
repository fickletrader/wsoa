import { Link, Outlet, useLocation } from "react-router-dom";
import Dither from "./components/Dither";

export default function AppLayout() {
  const location = useLocation();
  const isAgentDetail = location.pathname.startsWith("/app/agent/");

  return (
    <div
      style={{
        height: isAgentDetail ? "100vh" : undefined,
        minHeight: isAgentDetail ? undefined : "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: isAgentDetail ? "hidden" : undefined,
      }}
    >
      {/* Dither background — only on non-detail pages */}
      {!isAgentDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
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
            waveFrequency={3}
            waveSpeed={0.04}
          />
        </div>
      )}

      {/* Content layer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Header bar — always visible, full width */}
        <div
          style={{
            background: isAgentDetail ? "#0d0d0d" : "rgba(10, 10, 10, 0.85)",
            backdropFilter: isAgentDetail ? undefined : "blur(8px)",
            borderBottom: "1px solid #1a1a1a",
            width: "100%",
            flexShrink: 0,
          }}
        >
          <nav
            style={{
              padding: "0.75rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
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
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <img
                src="/wsoalogo.png"
                alt=""
                style={{ height: "1em", filter: "invert(1)" }}
              />
              WSOA
            </Link>
            <div
              style={{
                display: "flex",
                gap: "1.25rem",
                alignItems: "center",
              }}
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
              <Link
                to="/app/monad"
                style={{
                  color: "#777",
                  fontSize: "0.78rem",
                  fontWeight: 300,
                  textDecoration: "none",
                }}
              >
                Monad
              </Link>
            </div>
          </nav>
        </div>

        {/* Main content */}
        {isAgentDetail ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Outlet />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
