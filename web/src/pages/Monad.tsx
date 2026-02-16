import { useEffect, useState } from "react";
import { api, type MonadTx } from "../api/client";

const card: React.CSSProperties = {
  padding: "1.25rem",
  borderRadius: 4,
  border: "1px solid #222",
  background: "#111",
};

const label: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 400,
  color: "#666",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "0.5rem",
};

export default function Monad() {
  const [txs, setTxs] = useState<MonadTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .monadTxs()
      .then(setTxs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: txs.length > 0 ? "#4ade80" : "#555",
            boxShadow:
              txs.length > 0 ? "0 0 8px rgba(74, 222, 128, 0.4)" : "none",
          }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "#eee",
          }}
        >
          Monad Integration
        </h1>
      </div>

      {/* Overview cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={card}>
          <div style={label}>Network</div>
          <div style={{ fontSize: "0.9rem", color: "#ddd", fontWeight: 400 }}>
            Monad Mainnet
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#555",
              fontFamily: "monospace",
              marginTop: "0.25rem",
            }}
          >
            Chain ID: 143
          </div>
        </div>
        <div style={card}>
          <div style={label}>Protocol</div>
          <div style={{ fontSize: "0.9rem", color: "#ddd", fontWeight: 400 }}>
            nad.fun
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#555",
              marginTop: "0.25rem",
            }}
          >
            Bonding curve token launchpad
          </div>
        </div>
        <div style={card}>
          <div style={label}>Transactions</div>
          <div style={{ fontSize: "1.2rem", color: "#ddd", fontWeight: 400 }}>
            {loading ? "-" : txs.length}
          </div>
        </div>
        <div style={card}>
          <div style={label}>Status</div>
          <div
            style={{
              fontSize: "0.9rem",
              color: txs.length > 0 ? "#4ade80" : "#f59e0b",
              fontWeight: 400,
            }}
          >
            {txs.length > 0 ? "Active" : "Ready"}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ ...card, marginBottom: "1.5rem" }}>
        <div style={{ ...label, marginBottom: "0.75rem" }}>How it works</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.84rem",
            color: "#999",
            fontWeight: 300,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            WSOA agents are trained in simulation, competing against each other
            over historical crypto data. The best-performing strategies graduate
            to real on-chain trading on{" "}
            <span style={{ color: "#ddd" }}>Monad</span> via{" "}
            <a
              href="https://nad.fun"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#ddd", textDecoration: "underline" }}
            >
              nad.fun
            </a>
            .
          </p>
          <p style={{ margin: 0 }}>
            nad.fun is a token launchpad on Monad with bonding curve mechanics.
            Agents can autonomously buy and sell tokens, getting price quotes
            from the Lens contract and executing trades through the Bonding
            Curve Router. Monad's fast finality and low gas costs make it ideal
            for autonomous agent trading at scale.
          </p>
          <div
            style={{
              display: "flex",
              gap: "2rem",
              marginTop: "0.25rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.2rem",
                }}
              >
                Lens
              </div>
              <code
                style={{
                  fontSize: "0.72rem",
                  color: "#777",
                  fontFamily: "monospace",
                }}
              >
                0x7e78...87ea
              </code>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.2rem",
                }}
              >
                Router
              </div>
              <code
                style={{
                  fontSize: "0.72rem",
                  color: "#777",
                  fontFamily: "monospace",
                }}
              >
                0x6F6B...c22
              </code>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "0.2rem",
                }}
              >
                RPC
              </div>
              <code
                style={{
                  fontSize: "0.72rem",
                  color: "#777",
                  fontFamily: "monospace",
                }}
              >
                monad-mainnet.drpc.org
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ ...card, marginBottom: "1.5rem" }}>
        <div style={{ ...label, marginBottom: "0.75rem" }}>
          Simulation to On-chain Pipeline
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.82rem",
            fontWeight: 300,
            flexWrap: "wrap",
          }}
        >
          {[
            { text: "Strategies compete in simulation", color: "#4ade80" },
            { text: "Top agents identified by metrics", color: "#60a5fa" },
            { text: "Agents trade live on nad.fun", color: "#c084fc" },
            { text: "Results verified on Monad", color: "#f59e0b" },
          ].map((step, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              {i > 0 && <span style={{ color: "#333" }}>&#8594;</span>}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: step.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#bbb" }}>{step.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction log */}
      <div style={card}>
        <div style={{ ...label, marginBottom: "0.75rem" }}>
          On-chain Transactions
        </div>
        {loading ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#555" }}>
            Loading...
          </p>
        ) : txs.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "#444",
              fontSize: "0.82rem",
              fontWeight: 300,
            }}
          >
            <p style={{ margin: "0 0 0.5rem" }}>No transactions yet.</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#333" }}>
              Run the nad.fun trading agent to execute on-chain trades:
            </p>
            <code
              style={{
                display: "inline-block",
                marginTop: "0.5rem",
                padding: "0.4rem 0.75rem",
                background: "#0d0d0d",
                borderRadius: 3,
                fontSize: "0.74rem",
                color: "#555",
              }}
            >
              cd monad && npx tsx nadfun-agent.ts buy &lt;token&gt;
              &lt;amount&gt;
            </code>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {txs.map((tx, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 1fr auto",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.6rem 0.75rem",
                  background: i % 2 === 0 ? "transparent" : "#0d0d0d",
                  borderRadius: 3,
                  fontSize: "0.78rem",
                  fontWeight: 300,
                }}
              >
                <span
                  style={{
                    color: tx.action === "buy" ? "#4ade80" : "#f87171",
                    fontWeight: 400,
                  }}
                >
                  {tx.action.toUpperCase()}
                </span>
                <span style={{ color: "#888" }}>
                  {tx.monAmount
                    ? `${tx.monAmount} MON`
                    : `${tx.tokenAmount} tokens`}
                </span>
                <a
                  href={`https://monadexplorer.com/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#777",
                    textDecoration: "none",
                    fontFamily: "monospace",
                    fontSize: "0.72rem",
                  }}
                >
                  {tx.hash.slice(0, 14)}...{tx.hash.slice(-8)}
                </a>
                <span
                  style={{
                    color: tx.status === "success" ? "#4ade80" : "#f87171",
                    fontSize: "0.72rem",
                  }}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
