/**
 * API client for WSOA Python backend (FastAPI).
 * Uses relative /api in dev (Vite proxy to localhost:8000) or VITE_API_URL when set.
 */

const base = import.meta.env.VITE_API_URL ?? "";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export interface LeaderboardRow {
  signature: string;
  strategy_id: string;
  model: string;
  cr: number | null;
  sortino: number | null;
  vol: number | null;
  mdd: number | null;
  initial_value: number;
  final_value: number;
  total_positions: number;
  date_range: string;
  error?: string;
}

export interface AgentDetail {
  signature: string;
  metrics: {
    cr: number;
    sortino: number | null;
    vol: number;
    mdd: number;
    initial_value: number;
    final_value: number;
    total_positions: number;
    date_range: string;
  };
  equity_curve: { date: string; total_value: number }[];
  trades: { date: string; action: string; symbol: string; amount: number }[];
}

export const api = {
  health: () => fetchApi<{ status: string }>("/api/health"),
  leaderboard: (sortBy = "CR") =>
    fetchApi<LeaderboardRow[]>(`/api/leaderboard?sort_by=${sortBy}`),
  agents: () => fetchApi<string[]>("/api/agents"),
  agentDetail: (signature: string) =>
    fetchApi<AgentDetail>(`/api/agents/${encodeURIComponent(signature)}`),
  compare: (signatures: string[]) =>
    fetchApi<AgentDetail[]>(
      `/api/compare?signatures=${signatures.map(encodeURIComponent).join(",")}`
    ),
};
