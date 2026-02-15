import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <h1
        style={{
          marginTop: 0,
          marginBottom: "1.25rem",
          fontSize: "1.1rem",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "#eee",
        }}
      >
        Leaderboard
      </h1>

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
                  style={{
                    borderBottom: "1px solid #1a1a1a",
                    background: isEven ? "transparent" : "#0d0d0d",
                    transition: "background 0.1s",
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
                  <td style={{ ...td, paddingLeft: "1rem" }}>
                    <Link
                      to={`/app/agent/${encodeURIComponent(r.signature)}`}
                      style={{
                        textDecoration: "none",
                        color: "#ddd",
                        fontWeight: 400,
                      }}
                    >
                      {r.display_name || r.signature}
                    </Link>
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
