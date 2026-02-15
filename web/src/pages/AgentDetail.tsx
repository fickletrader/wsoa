import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type AgentDetail as AgentDetailType } from "../api/client";

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/* ── Metric card ─────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: boolean;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 4,
        padding: "0.85rem 1rem",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 400,
          color: "#666",
          marginBottom: "0.3rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.15rem",
          fontWeight: 300,
          color: sub ? "#777" : "#ddd",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Equity chart (SVG) ──────────────────────────────────────────── */

function EquityChart({
  curve,
}: {
  curve: { date: string; total_value: number }[];
}) {
  if (curve.length === 0) return <p style={{ color: "#555" }}>No data.</p>;

  const values = curve.map((c) => c.total_value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const W = 600;
  const H = 160;
  const pad = { top: 8, bottom: 22, left: 0, right: 0 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const points = curve.map((c, i) => {
    const x = pad.left + (i / Math.max(curve.length - 1, 1)) * plotW;
    const y = pad.top + plotH - ((c.total_value - minVal) / range) * plotH;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${pad.left},${pad.top + plotH}`,
    ...points,
    `${pad.left + plotW},${pad.top + plotH}`,
  ].join(" ");

  const labelInterval = Math.max(1, Math.floor(curve.length / 5));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#888" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#888" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon fill="url(#eq-grad)" points={areaPoints} />
      <polyline
        fill="none"
        stroke="#999"
        strokeWidth="1.2"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
      {curve.map((c, i) =>
        i % labelInterval === 0 || i === curve.length - 1 ? (
          <text
            key={i}
            x={pad.left + (i / Math.max(curve.length - 1, 1)) * plotW}
            y={H - 4}
            fill="#555"
            fontSize="7"
            textAnchor="middle"
          >
            {c.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function AgentDetail() {
  const { signature } = useParams<{ signature: string }>();
  const [data, setData] = useState<AgentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!signature) return;
    api
      .agentDetail(signature)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [signature]);

  if (loading)
    return (
      <p style={{ color: "#777", padding: "2rem", fontWeight: 300 }}>
        Loading...
      </p>
    );
  if (error)
    return (
      <p style={{ color: "#f87171", padding: "2rem", fontWeight: 300 }}>
        Error: {error}
      </p>
    );
  if (!data || "error" in data)
    return (
      <p style={{ padding: "2rem", fontWeight: 300, color: "#777" }}>
        Agent not found.
      </p>
    );

  const { metrics, equity_curve, trades } = data;

  return (
    <section style={{ maxWidth: 860 }}>
      {/* Back */}
      <Link
        to="/app"
        style={{
          color: "#666",
          textDecoration: "none",
          fontSize: "0.8rem",
          fontWeight: 300,
          display: "inline-block",
          marginBottom: "1rem",
        }}
      >
        ← Back
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "0.2rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 400,
            color: "#eee",
            letterSpacing: "-0.01em",
          }}
        >
          {data.display_name || data.signature}
          <span
            style={{
              fontWeight: 300,
              color: "#666",
              marginLeft: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            {data.basemodel}
          </span>
        </h1>
      </div>
      {data.strategy_description && (
        <p
          style={{
            color: "#555",
            margin: "0 0 1.25rem",
            fontSize: "0.8rem",
            fontWeight: 300,
          }}
        >
          {data.strategy_description}
        </p>
      )}

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "0.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <MetricCard label="Return" value={fmtPct(metrics.cr)} />
        <MetricCard
          label="Sortino"
          value={metrics.sortino != null ? metrics.sortino.toFixed(2) : "-"}
        />
        <MetricCard
          label="Volatility"
          value={(metrics.vol * 100).toFixed(2) + "%"}
        />
        <MetricCard label="Max Drawdown" value={fmtPct(metrics.mdd)} />
        <MetricCard label="Initial" value={fmtUsd(metrics.initial_value)} sub />
        <MetricCard label="Final" value={fmtUsd(metrics.final_value)} />
      </div>

      <p
        style={{
          color: "#555",
          fontSize: "0.72rem",
          fontWeight: 300,
          marginBottom: "1.25rem",
        }}
      >
        {metrics.date_range} &middot; {metrics.total_positions} positions
      </p>

      {/* Equity curve */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h2
          style={{
            fontSize: "0.78rem",
            fontWeight: 400,
            color: "#666",
            marginBottom: "0.5rem",
          }}
        >
          Equity Curve
        </h2>
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 4,
            padding: "0.75rem",
          }}
        >
          <EquityChart curve={equity_curve} />
        </div>
      </div>

      {/* Trades */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h2
          style={{
            fontSize: "0.78rem",
            fontWeight: 400,
            color: "#666",
            marginBottom: "0.5rem",
          }}
        >
          Recent Trades
        </h2>
        {trades.length === 0 ? (
          <p style={{ color: "#555", fontWeight: 300, fontSize: "0.82rem" }}>
            No trades recorded.
          </p>
        ) : (
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #222",
                    background: "#161616",
                  }}
                >
                  <th
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      fontWeight: 400,
                      color: "#666",
                      fontSize: "0.72rem",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      fontWeight: 400,
                      color: "#666",
                      fontSize: "0.72rem",
                    }}
                  >
                    Action
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      fontWeight: 400,
                      color: "#666",
                      fontSize: "0.72rem",
                    }}
                  >
                    Symbol
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "right",
                      fontWeight: 400,
                      color: "#666",
                      fontSize: "0.72rem",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades
                  .slice()
                  .reverse()
                  .map((t, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #1a1a1a",
                        background: i % 2 === 0 ? "transparent" : "#0d0d0d",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          color: "#777",
                          fontWeight: 300,
                        }}
                      >
                        {t.date}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          color: "#ccc",
                          fontWeight: 400,
                        }}
                      >
                        {t.action}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          color: "#aaa",
                          fontWeight: 300,
                        }}
                      >
                        {t.symbol}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          textAlign: "right",
                          color: "#aaa",
                          fontWeight: 300,
                        }}
                      >
                        {typeof t.amount === "number"
                          ? t.amount.toLocaleString("en-US", {
                              maximumFractionDigits: 4,
                            })
                          : t.amount}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Strategy prompt (collapsible) */}
      {data.strategy_prompt && (
        <div style={{ marginBottom: "1.75rem" }}>
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 400,
              padding: 0,
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: promptOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
                fontSize: "0.6rem",
              }}
            >
              ▶
            </span>
            Strategy Prompt
          </button>
          {promptOpen && (
            <pre
              style={{
                background: "#0d0d0d",
                border: "1px solid #222",
                borderRadius: 4,
                padding: "0.85rem 1rem",
                color: "#888",
                fontSize: "0.72rem",
                fontWeight: 300,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 350,
                overflow: "auto",
              }}
            >
              {data.strategy_prompt.trim()}
            </pre>
          )}
        </div>
      )}

      {/* Run Live button (disabled) */}
      <button
        disabled
        style={{
          padding: "0.55rem 1.25rem",
          borderRadius: 4,
          border: "1px solid #222",
          background: "#161616",
          color: "#555",
          fontSize: "0.8rem",
          fontWeight: 400,
          cursor: "not-allowed",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
        title="Live trading on Monad — coming soon"
      >
        Run Live
        <span
          style={{
            fontSize: "0.6rem",
            background: "#1a1a1a",
            border: "1px solid #222",
            borderRadius: 3,
            padding: "0.12rem 0.35rem",
            color: "#555",
            fontWeight: 400,
          }}
        >
          Coming Soon
        </span>
      </button>
    </section>
  );
}
