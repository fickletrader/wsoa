import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type AgentDetail as AgentDetailType } from "../api/client";

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function AgentDetail() {
  const { signature } = useParams<{ signature: string }>();
  const [data, setData] = useState<AgentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signature) return;
    api
      .agentDetail(signature)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [signature]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#f87171" }}>Error: {error}</p>;
  if (!data || "error" in data) return <p>Agent not found.</p>;

  const { metrics, equity_curve, trades } = data;
  const minVal = Math.min(...equity_curve.map((e) => e.total_value));
  const maxVal = Math.max(...equity_curve.map((e) => e.total_value));
  const range = maxVal - minVal || 1;

  return (
    <section>
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/app">← Leaderboard</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>{data.signature}</h1>

      <h2 style={{ marginTop: "1.5rem" }}>Metrics</h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
        }}
      >
        <li>
          CR:{" "}
          <strong style={{ color: metrics.cr >= 0 ? "#4ade80" : "#f87171" }}>
            {fmtPct(metrics.cr)}
          </strong>
        </li>
        <li>
          Sortino: {metrics.sortino != null ? metrics.sortino.toFixed(2) : "—"}
        </li>
        <li>Vol: {metrics.vol.toFixed(4)}</li>
        <li>
          MDD: <span style={{ color: "#f87171" }}>{fmtPct(metrics.mdd)}</span>
        </li>
        <li>Initial: {fmtNum(metrics.initial_value)}</li>
        <li>Final: {fmtNum(metrics.final_value)}</li>
      </ul>
      <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
        {metrics.date_range}
      </p>

      <h2 style={{ marginTop: "1.5rem" }}>Equity curve</h2>
      <div
        style={{
          height: 200,
          background: "#1e293b",
          borderRadius: 8,
          padding: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(equity_curve.length * 4, 100)} 100`}
          preserveAspectRatio="none"
        >
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.5"
            points={equity_curve
              .map(
                (e, i) =>
                  `${i},${100 - ((e.total_value - minVal) / range) * 95}`
              )
              .join(" ")}
          />
        </svg>
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Recent trades</h2>
      {trades.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No trades recorded.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {trades
            .slice(-20)
            .reverse()
            .map((t, i) => (
              <li
                key={i}
                style={{
                  padding: "0.25rem 0",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                {t.date} — <strong>{t.action}</strong> {t.symbol} {t.amount}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
