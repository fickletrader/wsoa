import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AgentDetail } from "../api/client";

function fmtPct(n: number | null): string {
  if (n == null) return "-";
  return (n * 100).toFixed(2) + "%";
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const COLORS = ["#ccc", "#888", "#555"];

const cellStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 300,
  fontSize: "0.82rem",
  color: "#aaa",
};

/* ── Overlaid equity curves ──────────────────────────────────────── */

function OverlaidChart({ details }: { details: AgentDetail[] }) {
  if (details.length === 0) return null;

  const allValues = details.flatMap((d) =>
    d.equity_curve.map((c) => c.total_value)
  );
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;
  const W = 600;
  const H = 160;
  const pad = { top: 8, bottom: 22, left: 0, right: 0 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const longest = details.reduce((a, b) =>
    a.equity_curve.length >= b.equity_curve.length ? a : b
  ).equity_curve;
  const labelInterval = Math.max(1, Math.floor(longest.length / 5));

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 4,
        padding: "0.75rem",
        marginBottom: "1rem",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="none"
      >
        {details.map((d, di) => {
          const pts = d.equity_curve
            .map((c, i) => {
              const x =
                pad.left + (i / Math.max(d.equity_curve.length - 1, 1)) * plotW;
              const y =
                pad.top + plotH - ((c.total_value - minVal) / range) * plotH;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={d.signature}
              fill="none"
              stroke={COLORS[di % COLORS.length]}
              strokeWidth="1.2"
              strokeLinejoin="round"
              points={pts}
            />
          );
        })}
        {longest.map((c, i) =>
          i % labelInterval === 0 || i === longest.length - 1 ? (
            <text
              key={i}
              x={pad.left + (i / Math.max(longest.length - 1, 1)) * plotW}
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

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {details.map((d, di) => (
          <div
            key={d.signature}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.72rem",
              color: "#888",
              fontWeight: 300,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: COLORS[di % COLORS.length],
                flexShrink: 0,
              }}
            />
            {d.display_name || d.signature}
            <span style={{ color: "#555" }}>({d.basemodel})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function Compare() {
  const [agents, setAgents] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<AgentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<
    { signature: string; display_name: string; basemodel: string }[]
  >([]);

  useEffect(() => {
    Promise.all([api.agents(), api.leaderboard()])
      .then(([agentList, lb]) => {
        setAgents(agentList);
        setLeaderboard(
          lb.map((r) => ({
            signature: r.signature,
            display_name: r.display_name || r.signature,
            basemodel: r.basemodel || "",
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setDetails([]);
      return;
    }
    setComparing(true);
    api
      .compare(selected)
      .then((list) =>
        setDetails(
          list.filter(
            (d): d is AgentDetail => "metrics" in d && !("error" in d)
          )
        )
      )
      .catch((e) => setError(e.message))
      .finally(() => setComparing(false));
  }, [selected.join(",")]);

  const toggle = (sig: string) => {
    if (selected.includes(sig)) {
      setSelected(selected.filter((s) => s !== sig));
    } else if (selected.length < 3) {
      setSelected([...selected, sig]);
    }
  };

  const getDisplay = (sig: string) => {
    const lb = leaderboard.find((r) => r.signature === sig);
    return lb ? `${lb.display_name} (${lb.basemodel})` : sig;
  };

  if (error)
    return (
      <p style={{ color: "#f87171", padding: "2rem", fontWeight: 300 }}>
        Error: {error}
      </p>
    );

  return (
    <section>
      <h1
        style={{
          marginTop: 0,
          marginBottom: "1rem",
          fontSize: "1.1rem",
          fontWeight: 400,
          color: "#eee",
          letterSpacing: "-0.01em",
        }}
      >
        Compare
      </h1>

      {/* Agent selector */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          marginBottom: "1.25rem",
        }}
      >
        {loading ? (
          <p style={{ color: "#777", fontWeight: 300, fontSize: "0.85rem" }}>
            Loading agents...
          </p>
        ) : agents.length === 0 ? (
          <p style={{ color: "#777", fontWeight: 300, fontSize: "0.85rem" }}>
            No agents available.
          </p>
        ) : (
          agents.map((sig) => {
            const isSelected = selected.includes(sig);
            return (
              <button
                key={sig}
                onClick={() => toggle(sig)}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: 3,
                  border: isSelected ? "1px solid #555" : "1px solid #222",
                  background: isSelected ? "#1a1a1a" : "transparent",
                  color: isSelected ? "#ddd" : "#777",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 300,
                  transition: "all 0.1s",
                }}
              >
                {getDisplay(sig)}
              </button>
            );
          })
        )}
      </div>

      {comparing && (
        <p style={{ color: "#777", fontWeight: 300, fontSize: "0.85rem" }}>
          Loading...
        </p>
      )}

      {/* Overlaid equity curves */}
      {details.length > 0 && <OverlaidChart details={details} />}

      {/* Metrics table */}
      {details.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            borderRadius: 4,
            border: "1px solid #222",
            background: "#111",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #222",
                  background: "#161616",
                }}
              >
                <th
                  style={{
                    ...cellStyle,
                    textAlign: "left",
                    fontWeight: 400,
                    color: "#666",
                    fontSize: "0.72rem",
                  }}
                >
                  Metric
                </th>
                {details.map((d) => (
                  <th
                    key={d.signature}
                    style={{
                      ...cellStyle,
                      textAlign: "right",
                      fontWeight: 400,
                      color: "#888",
                      fontSize: "0.72rem",
                    }}
                  >
                    <Link
                      to={`/app/agent/${encodeURIComponent(d.signature)}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {d.display_name || d.signature}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Return",
                  fn: (d: AgentDetail) => fmtPct(d.metrics.cr),
                },
                {
                  label: "Sortino",
                  fn: (d: AgentDetail) =>
                    d.metrics.sortino != null
                      ? d.metrics.sortino.toFixed(2)
                      : "-",
                },
                {
                  label: "Volatility",
                  fn: (d: AgentDetail) =>
                    (d.metrics.vol * 100).toFixed(2) + "%",
                },
                {
                  label: "Max Drawdown",
                  fn: (d: AgentDetail) => fmtPct(d.metrics.mdd),
                },
                {
                  label: "Initial",
                  fn: (d: AgentDetail) => fmtUsd(d.metrics.initial_value),
                },
                {
                  label: "Final",
                  fn: (d: AgentDetail) => fmtUsd(d.metrics.final_value),
                },
              ].map((row, ri) => (
                <tr
                  key={row.label}
                  style={{
                    borderBottom: "1px solid #1a1a1a",
                    background: ri % 2 === 0 ? "transparent" : "#0d0d0d",
                  }}
                >
                  <td style={{ ...cellStyle, color: "#777" }}>{row.label}</td>
                  {details.map((d) => (
                    <td
                      key={d.signature}
                      style={{ ...cellStyle, textAlign: "right" }}
                    >
                      {row.fn(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
