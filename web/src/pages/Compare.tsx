import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AgentDetail } from "../api/client";

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return (n * 100).toFixed(2) + "%";
}

export default function Compare() {
  const [agents, setAgents] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<AgentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .agents()
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setDetails([]);
      return;
    }
    setLoading(true);
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
      .finally(() => setLoading(false));
  }, [selected.join(",")]);

  const toggle = (sig: string) => {
    if (selected.includes(sig)) {
      setSelected(selected.filter((s) => s !== sig));
    } else if (selected.length < 3) {
      setSelected([...selected, sig]);
    }
  };

  if (error) return <p style={{ color: "#f87171" }}>Error: {error}</p>;

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Compare agents</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
        Select up to 3 agents to compare metrics side by side.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {agents.map((sig) => (
          <button
            key={sig}
            onClick={() => toggle(sig)}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: 6,
              border: selected.includes(sig)
                ? "2px solid #38bdf8"
                : "1px solid #475569",
              background: selected.includes(sig) ? "#1e3a5f" : "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            {sig} {selected.includes(sig) ? "✓" : ""}
          </button>
        ))}
      </div>

      {loading && selected.length > 0 && <p>Loading…</p>}
      {details.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>
                  Metric
                </th>
                {details.map((d) => (
                  <th
                    key={d.signature}
                    style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}
                  >
                    <Link to={`/agent/${encodeURIComponent(d.signature)}`}>
                      {d.signature}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>CR</td>
                {details.map((d) => (
                  <td
                    key={d.signature}
                    style={{
                      padding: "0.5rem 0.75rem",
                      color: d.metrics.cr >= 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {fmtPct(d.metrics.cr)}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>Sortino</td>
                {details.map((d) => (
                  <td key={d.signature} style={{ padding: "0.5rem 0.75rem" }}>
                    {d.metrics.sortino != null
                      ? d.metrics.sortino.toFixed(2)
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>Vol</td>
                {details.map((d) => (
                  <td key={d.signature} style={{ padding: "0.5rem 0.75rem" }}>
                    {d.metrics.vol.toFixed(4)}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>MDD</td>
                {details.map((d) => (
                  <td
                    key={d.signature}
                    style={{ padding: "0.5rem 0.75rem", color: "#f87171" }}
                  >
                    {fmtPct(d.metrics.mdd)}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>Final value</td>
                {details.map((d) => (
                  <td key={d.signature} style={{ padding: "0.5rem 0.75rem" }}>
                    {d.metrics.final_value.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
