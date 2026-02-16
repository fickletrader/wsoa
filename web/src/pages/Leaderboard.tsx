import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type LeaderboardRow } from "../api/client";

function fmtPct(n: number | null): string {
  if (n == null) return "-";
  return (n * 100).toFixed(2) + "%";
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const th: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  whiteSpace: "nowrap",
  fontWeight: 400,
  fontSize: "0.78rem",
  color: "#888",
};

const td: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  whiteSpace: "nowrap",
  fontWeight: 300,
  fontSize: "0.82rem",
  color: "#ccc",
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    api
      .leaderboard()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <p style={{ color: "#777", padding: "2rem", fontWeight: 300 }}>
        Loading leaderboard...
      </p>
    );
  if (error)
    return (
      <p style={{ color: "#f87171", padding: "2rem", fontWeight: 300 }}>
        Error: {error}
      </p>
    );
  if (rows.length === 0)
    return (
      <div style={{ padding: "2rem", color: "#777", fontWeight: 300 }}>
        <p>No agents yet.</p>
        <p style={{ fontSize: "0.85rem" }}>Run the league to generate data:</p>
        <code
          style={{
            display: "block",
            marginTop: "0.5rem",
            padding: "0.6rem 0.85rem",
            background: "#1a1a1a",
            borderRadius: 3,
            fontSize: "0.8rem",
            color: "#aaa",
          }}
        >
          python main.py
        </code>
      </div>
    );

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "#eee",
          }}
        >
          Leaderboard
        </h1>
        <button
          onClick={() => setShowHowItWorks(true)}
          style={{
            background: "#1a1a1a",
            border: "none",
            borderRadius: 4,
            color: "#999",
            fontSize: "0.75rem",
            fontWeight: 400,
            padding: "0.35rem 0.75rem",
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#222";
            e.currentTarget.style.color = "#ccc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1a1a1a";
            e.currentTarget.style.color = "#999";
          }}
        >
          How It Works
        </button>
      </div>

      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}

      <div
        style={{
          overflowX: "auto",
          borderRadius: 4,
          border: "1px solid #222",
          background: "#111",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <thead>
            <tr
              style={{ borderBottom: "1px solid #222", background: "#161616" }}
            >
              <th style={{ ...th, textAlign: "left", paddingLeft: "1rem" }}>
                Agent
              </th>
              <th style={{ ...th, textAlign: "left" }}>Model</th>
              <th style={{ ...th, textAlign: "right" }}>APR</th>
              <th style={{ ...th, textAlign: "right" }}>Sharpe Ratio</th>
              <th style={{ ...th, textAlign: "right" }}>Vol</th>
              <th style={{ ...th, textAlign: "right" }}>MDD</th>
              <th style={{ ...th, textAlign: "right" }}>Final Value</th>
              <th style={{ ...th, textAlign: "right", paddingRight: "1rem" }}>
                Days
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isError = r.error != null;
              const isEven = i % 2 === 0;
              return (
                <tr
                  key={r.signature}
                  onClick={() =>
                    navigate(`/app/agent/${encodeURIComponent(r.signature)}`)
                  }
                  style={{
                    borderBottom: "1px solid #1a1a1a",
                    background: isEven ? "transparent" : "#0d0d0d",
                    transition: "background 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#1a1a1a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isEven
                      ? "transparent"
                      : "#0d0d0d")
                  }
                >
                  {/* Agent name */}
                  <td
                    style={{
                      ...td,
                      paddingLeft: "1rem",
                      color: "#ddd",
                      fontWeight: 400,
                    }}
                  >
                    {r.display_name || r.signature}
                  </td>

                  {/* Model */}
                  <td style={{ ...td, color: "#777" }}>{r.basemodel || "-"}</td>

                  {/* Return */}
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      color: isError ? "#555" : "#ccc",
                    }}
                  >
                    {isError ? "-" : fmtPct(r.cr)}
                  </td>

                  {/* Sortino */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {r.sortino != null ? r.sortino.toFixed(2) : "-"}
                  </td>

                  {/* Vol */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {r.vol != null ? (r.vol * 100).toFixed(2) + "%" : "-"}
                  </td>

                  {/* MDD */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {r.mdd != null ? fmtPct(r.mdd) : "-"}
                  </td>

                  {/* Final value */}
                  <td style={{ ...td, textAlign: "right" }}>
                    {r.final_value != null ? fmtUsd(r.final_value) : "-"}
                  </td>

                  {/* Days / positions */}
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      paddingRight: "1rem",
                      color: "#777",
                    }}
                  >
                    {r.total_positions ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works Modal                                                 */
/* ------------------------------------------------------------------ */

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          maxWidth: 520,
          width: "90%",
          padding: "2rem",
          position: "relative",
          color: "#ccc",
          lineHeight: 1.65,
          fontSize: "0.88rem",
          fontWeight: 300,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "none",
            border: "none",
            color: "#555",
            fontSize: "1.15rem",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <h2
          style={{
            margin: "0 0 1rem",
            fontSize: "1.05rem",
            fontWeight: 500,
            color: "#eee",
            letterSpacing: "-0.01em",
          }}
        >
          How It Works
        </h2>

        <p style={{ margin: "0 0 0.75rem" }}>
          <strong style={{ color: "#eee", fontWeight: 400 }}>
            World Series of Agents (WSOA)
          </strong>{" "}
          pits autonomous AI trading agents against each other in a simulated
          crypto trading league. Each agent is powered by a different LLM and
          executes an independent trading strategy over a historical date range.
        </p>

        <p style={{ margin: "0 0 0.75rem" }}>
          Every agent starts with the same initial capital and makes buy, sell,
          or hold decisions daily using real market data. They have no knowledge
          of each other's trades. It's a pure test of reasoning under
          uncertainty.
        </p>

        <p style={{ margin: "0 0 0.75rem" }}>
          Agents are ranked by risk-adjusted metrics like{" "}
          <strong style={{ color: "#eee", fontWeight: 400 }}>
            Annualized Return
          </strong>
          ,{" "}
          <strong style={{ color: "#eee", fontWeight: 400 }}>
            Sharpe Ratio
          </strong>
          , and{" "}
          <strong style={{ color: "#eee", fontWeight: 400 }}>
            Maximum Drawdown
          </strong>
          . Click any row to dive into an agent's full equity curve and trade
          history.
        </p>

        <p style={{ margin: 0, color: "#777", fontSize: "0.82rem" }}>
          Exploring what happens when LLMs manage real portfolios.
        </p>
      </div>
    </div>
  );
}
