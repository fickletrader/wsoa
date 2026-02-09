import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardRow } from "../api/client";

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return (n * 100).toFixed(2) + "%";
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

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

  if (loading) return <p>Loading leaderboard…</p>;
  if (error) return <p style={{ color: "#f87171" }}>Error: {error}</p>;
  if (rows.length === 0)
    return <p>No agents yet. Run the league to generate data.</p>;

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Leaderboard</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Ranked by total return (CR).
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ borderBottom: "1px solid #334155", textAlign: "left" }}
            >
              <th style={{ padding: "0.5rem 0.75rem" }}>#</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Agent</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>CR</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Sortino</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Vol</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>MDD</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Initial</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Final</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.signature}
                style={{ borderBottom: "1px solid #1e293b" }}
              >
                <td style={{ padding: "0.5rem 0.75rem" }}>{i + 1}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  <Link to={`/app/agent/${encodeURIComponent(r.signature)}`}>
                    {r.signature}
                  </Link>
                </td>
                <td
                  style={{
                    padding: "0.5rem 0.75rem",
                    color: (r.cr ?? 0) >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {fmtPct(r.cr)}
                </td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  {r.sortino != null ? r.sortino.toFixed(2) : "—"}
                </td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  {r.vol != null ? r.vol.toFixed(4) : "—"}
                </td>
                <td style={{ padding: "0.5rem 0.75rem", color: "#f87171" }}>
                  {fmtPct(r.mdd)}
                </td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  {fmtNum(r.initial_value)}
                </td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  {fmtNum(r.final_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
