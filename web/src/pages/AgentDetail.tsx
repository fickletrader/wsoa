import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  api,
  type AgentDetail as AgentDetailType,
  type AgentLogs,
} from "../api/client";

function fmtPct(n: number): string {
  const v = (n * 100).toFixed(2);
  return n >= 0 ? `+${v}%` : `${v}%`;
}
function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/* ── Equity chart ────────────────────────────────────────────────── */

function EquityChart({
  curve,
}: {
  curve: { date: string; total_value: number }[];
}) {
  if (curve.length === 0)
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
        }}
      >
        No data
      </div>
    );

  const values = curve.map((c) => c.total_value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const W = 1000;
  const H = 420;
  const pad = { top: 16, bottom: 30, left: 60, right: 12 };
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

  const labelInterval = Math.max(1, Math.floor(curve.length / 10));
  const positive = values[values.length - 1] >= values[0];

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    frac,
    value: minVal + range * frac,
    y: pad.top + plotH * (1 - frac),
  }));

  const fmtAxis = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="eq-area" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={positive ? "#4ade80" : "#f87171"}
            stopOpacity={0.1}
          />
          <stop
            offset="100%"
            stopColor={positive ? "#4ade80" : "#f87171"}
            stopOpacity={0}
          />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => (
        <g key={tick.frac}>
          <line
            x1={pad.left}
            y1={tick.y}
            x2={pad.left + plotW}
            y2={tick.y}
            stroke="#1a1a1a"
            strokeWidth="0.5"
          />
          <text
            x={pad.left - 8}
            y={tick.y + 3}
            fill="#444"
            fontSize="9"
            textAnchor="end"
            fontFamily="inherit"
          >
            {fmtAxis(tick.value)}
          </text>
        </g>
      ))}

      <polygon fill="url(#eq-area)" points={areaPoints} />
      <polyline
        fill="none"
        stroke={positive ? "#4ade80" : "#f87171"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={points.join(" ")}
      />

      {curve.map((c, i) =>
        i % labelInterval === 0 || i === curve.length - 1 ? (
          <text
            key={i}
            x={pad.left + (i / Math.max(curve.length - 1, 1)) * plotW}
            y={H - 6}
            fill="#444"
            fontSize="9"
            textAnchor="middle"
            fontFamily="inherit"
          >
            {c.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ── Stat row ────────────────────────────────────────────────────── */

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0.4rem 0",
        borderBottom: "1px solid #161616",
      }}
    >
      <span style={{ color: "#555", fontSize: "0.72rem", fontWeight: 300 }}>
        {label}
      </span>
      <span
        style={{
          color: color || "#aaa",
          fontSize: "0.72rem",
          fontWeight: 400,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Info bar (below shared header) ──────────────────────────────── */

function InfoBar({
  data,
  positive,
}: {
  data: AgentDetailType;
  positive: boolean;
}) {
  return (
    <div
      style={{
        height: 36,
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
        display: "flex",
        alignItems: "center",
        padding: "0 1rem",
        gap: "1.25rem",
        flexShrink: 0,
      }}
    >
      <Link
        to="/app"
        style={{
          color: "#444",
          textDecoration: "none",
          fontSize: "0.68rem",
          fontWeight: 300,
        }}
      >
        ← Back
      </Link>

      <div style={{ width: 1, height: 16, background: "#1a1a1a" }} />

      <span style={{ color: "#ddd", fontWeight: 400, fontSize: "0.78rem" }}>
        {data.display_name || data.signature}
      </span>
      <span style={{ color: "#555", fontWeight: 300, fontSize: "0.68rem" }}>
        {data.basemodel}
      </span>

      <div style={{ flex: 1 }} />

      <QuickStat label="Value" value={fmtUsd(data.metrics.final_value)} />
      <QuickStat
        label="Return"
        value={fmtPct(data.metrics.cr)}
        color={positive ? "#4ade80" : "#f87171"}
      />
      <QuickStat
        label="Vol"
        value={(data.metrics.vol * 100).toFixed(2) + "%"}
      />
      <QuickStat label="MDD" value={fmtPct(data.metrics.mdd)} color="#f87171" />
      <QuickStat
        label="Positions"
        value={String(data.metrics.total_positions)}
      />
    </div>
  );
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: "0.55rem",
          color: "#444",
          fontWeight: 300,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          color: color || "#aaa",
          fontWeight: 400,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */

export default function AgentDetail() {
  const { signature } = useParams<{ signature: string }>();
  const [data, setData] = useState<AgentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"trades" | "reasoning" | "prompt">(
    "trades"
  );
  const [logs, setLogs] = useState<AgentLogs | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string | undefined>();

  useEffect(() => {
    if (!signature) return;
    api
      .agentDetail(signature)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [signature]);

  // Fetch logs when reasoning tab is selected
  useEffect(() => {
    if (bottomTab !== "reasoning" || !signature) return;
    setLogsLoading(true);
    api
      .agentLogs(signature, selectedLogDate)
      .then(setLogs)
      .catch(() => setLogs(null))
      .finally(() => setLogsLoading(false));
  }, [bottomTab, signature, selectedLogDate]);

  if (loading)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#555",
          fontWeight: 300,
        }}
      >
        Loading...
      </div>
    );
  if (error)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f87171",
          fontWeight: 300,
        }}
      >
        Error: {error}
      </div>
    );
  if (!data || "error" in data)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#555",
          fontWeight: 300,
        }}
      >
        Agent not found.
      </div>
    );

  const { metrics, equity_curve, trades } = data;
  const positive = metrics.cr >= 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
        minHeight: 0,
      }}
    >
      {/* Agent info bar (below the shared WSOA header) */}
      <InfoBar data={data} positive={positive} />

      {/* Body grid: chart + sidebar (top), trades + prompt (bottom) */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gridTemplateRows: "1fr auto",
          gap: "1px",
          background: "#1a1a1a",
          minHeight: 0,
        }}
      >
        {/* ── Chart panel (top-left) ── */}
        <div
          style={{
            background: "#0a0a0a",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.6rem",
              marginBottom: "0.25rem",
              flexShrink: 0,
            }}
          >
            <span
              style={{ color: "#ddd", fontSize: "1.25rem", fontWeight: 400 }}
            >
              {fmtUsd(metrics.final_value)}
            </span>
            <span
              style={{
                color: positive ? "#4ade80" : "#f87171",
                fontSize: "0.82rem",
                fontWeight: 400,
              }}
            >
              {fmtPct(metrics.cr)}
            </span>
            <span
              style={{ color: "#333", fontSize: "0.68rem", fontWeight: 300 }}
            >
              {metrics.date_range}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EquityChart curve={equity_curve} />
          </div>
        </div>

        {/* ── Right sidebar (top-right) ── */}
        <div
          style={{
            background: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "0.75rem", flex: 1 }}>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#444",
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Performance
            </div>
            <StatRow
              label="Return"
              value={fmtPct(metrics.cr)}
              color={positive ? "#4ade80" : "#f87171"}
            />
            <StatRow
              label="Sortino Ratio"
              value={metrics.sortino != null ? metrics.sortino.toFixed(2) : "-"}
            />
            <StatRow
              label="Volatility"
              value={(metrics.vol * 100).toFixed(2) + "%"}
            />
            <StatRow
              label="Max Drawdown"
              value={fmtPct(metrics.mdd)}
              color="#f87171"
            />
            <StatRow
              label="Initial Value"
              value={fmtUsd(metrics.initial_value)}
            />
            <StatRow label="Final Value" value={fmtUsd(metrics.final_value)} />
            <StatRow
              label="Positions"
              value={String(metrics.total_positions)}
            />

            {data.strategy_description && (
              <div style={{ marginTop: "0.75rem" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#444",
                    fontWeight: 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.35rem",
                  }}
                >
                  Strategy
                </div>
                <p
                  style={{
                    color: "#555",
                    fontSize: "0.72rem",
                    fontWeight: 300,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {data.strategy_description}
                </p>
              </div>
            )}
          </div>

          {/* Deploy panel */}
          <div style={{ borderTop: "1px solid #1a1a1a", padding: "0.75rem" }}>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#444",
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.6rem",
              }}
            >
              Run Agent
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.62rem",
                  color: "#444",
                  marginBottom: "0.15rem",
                }}
              >
                Date Range
              </div>
              <div
                style={{
                  background: "#111",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.72rem",
                  color: "#333",
                  border: "1px solid #1a1a1a",
                }}
              >
                2026-01-28 → 2026-02-07
              </div>
            </div>
            <div style={{ marginBottom: "0.6rem" }}>
              <div
                style={{
                  fontSize: "0.62rem",
                  color: "#444",
                  marginBottom: "0.15rem",
                }}
              >
                Initial Capital
              </div>
              <div
                style={{
                  background: "#111",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.72rem",
                  color: "#333",
                  border: "1px solid #1a1a1a",
                }}
              >
                $50,000.00
              </div>
            </div>
            <button
              disabled
              style={{
                width: "100%",
                padding: "0.55rem",
                background: "#161616",
                color: "#333",
                fontSize: "0.75rem",
                fontWeight: 400,
                cursor: "not-allowed",
                border: "1px solid #1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              Deploy Agent
              <span
                style={{
                  fontSize: "0.55rem",
                  color: "#333",
                  background: "#1a1a1a",
                  padding: "0.1rem 0.3rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Soon
              </span>
            </button>
          </div>
        </div>

        {/* ── Bottom panel: tabbed (spans both columns) ── */}
        <div
          style={{
            gridColumn: "1 / -1",
            background: "#0a0a0a",
            maxHeight: 300,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #161616",
              flexShrink: 0,
              gap: 0,
            }}
          >
            {(
              [
                {
                  id: "trades" as const,
                  label: "Trade History",
                  count: trades.length,
                },
                { id: "reasoning" as const, label: "Reasoning Traces" },
                { id: "prompt" as const, label: "System Prompt" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBottomTab(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom:
                    bottomTab === tab.id
                      ? "1px solid #666"
                      : "1px solid transparent",
                  color: bottomTab === tab.id ? "#bbb" : "#444",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  padding: "0.5rem 1rem",
                  transition: "color 0.1s",
                }}
              >
                {tab.label}
                {"count" in tab && tab.count != null && (
                  <span
                    style={{
                      marginLeft: "0.4rem",
                      fontSize: "0.6rem",
                      color: "#333",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}

            {/* Date selector for reasoning tab */}
            {bottomTab === "reasoning" && logs && logs.dates.length > 1 && (
              <select
                value={logs.selected_date}
                onChange={(e) => setSelectedLogDate(e.target.value)}
                style={{
                  marginLeft: "auto",
                  marginRight: "0.75rem",
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  color: "#777",
                  fontSize: "0.65rem",
                  padding: "0.2rem 0.4rem",
                  cursor: "pointer",
                }}
              >
                {logs.dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {/* ── Trades ── */}
            {bottomTab === "trades" &&
              (trades.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: "#333",
                    fontSize: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  No trades recorded
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.72rem",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#0a0a0a",
                    }}
                  >
                    <tr style={{ borderBottom: "1px solid #161616" }}>
                      {["Time", "Side", "Symbol", "Size"].map((h, idx) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.35rem 0.75rem",
                            textAlign: idx === 3 ? "right" : "left",
                            fontWeight: 400,
                            color: "#444",
                            fontSize: "0.65rem",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades
                      .slice()
                      .reverse()
                      .map((t, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                          <td
                            style={{
                              padding: "0.3rem 0.75rem",
                              color: "#555",
                              fontWeight: 300,
                            }}
                          >
                            {t.date}
                          </td>
                          <td
                            style={{
                              padding: "0.3rem 0.75rem",
                              fontWeight: 400,
                              color: t.action === "buy" ? "#4ade80" : "#f87171",
                            }}
                          >
                            {t.action.toUpperCase()}
                          </td>
                          <td
                            style={{
                              padding: "0.3rem 0.75rem",
                              color: "#777",
                              fontWeight: 300,
                            }}
                          >
                            {t.symbol}
                          </td>
                          <td
                            style={{
                              padding: "0.3rem 0.75rem",
                              textAlign: "right",
                              color: "#777",
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
              ))}

            {/* ── Reasoning traces ── */}
            {bottomTab === "reasoning" &&
              (logsLoading ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: "#444",
                    fontSize: "0.72rem",
                    textAlign: "center",
                  }}
                >
                  Loading traces...
                </div>
              ) : !logs || logs.logs.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: "#333",
                    fontSize: "0.72rem",
                    textAlign: "center",
                  }}
                >
                  No reasoning logs available
                </div>
              ) : (
                <div style={{ padding: "0.5rem 0.75rem" }}>
                  {logs.logs.map((entry, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: "0.5rem",
                        padding: "0.5rem 0.6rem",
                        background:
                          entry.role === "assistant"
                            ? "#0f0f0f"
                            : "transparent",
                        borderLeft:
                          entry.role === "assistant"
                            ? "2px solid #333"
                            : "2px solid #1a1a1a",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.58rem",
                          color: entry.role === "assistant" ? "#666" : "#444",
                          fontWeight: 400,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {entry.role === "assistant" ? "Agent" : "System"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: entry.role === "assistant" ? "#999" : "#555",
                          fontWeight: 300,
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {entry.content.length > 2000
                          ? entry.content.slice(0, 2000) + "..."
                          : entry.content}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {/* ── System Prompt ── */}
            {bottomTab === "prompt" &&
              (data.strategy_prompt ? (
                <pre
                  style={{
                    margin: 0,
                    padding: "0.6rem 0.75rem",
                    color: "#555",
                    fontSize: "0.62rem",
                    fontWeight: 300,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {data.strategy_prompt.trim()}
                </pre>
              ) : (
                <div
                  style={{
                    padding: "1.5rem",
                    color: "#333",
                    fontSize: "0.72rem",
                    textAlign: "center",
                  }}
                >
                  No prompt available
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
