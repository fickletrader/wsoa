/**
 * API client for WSOA Python backend (FastAPI).
 * Uses relative /api in dev (Vite proxy) or VITE_API_URL when set.
 */

const base = import.meta.env.VITE_API_URL ?? "";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

/* ── Types ────────────────────────────────────────────────────────── */

export interface LeaderboardRow {
  signature: string;
  display_name: string;
  basemodel: string;
  strategy_id: string;
  strategy_description: string;
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
  display_name: string;
  basemodel: string;
  strategy_id: string;
  strategy_description: string;
  strategy_prompt: string;
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
  trades: {
    date: string;
    action: string;
    symbol: string;
    amount: number;
  }[];
}

export interface StrategyInfo {
  strategy_id: string;
  display_name: string;
  description: string;
}

export interface AgentLogs {
  signature: string;
  dates: string[];
  selected_date: string;
  logs: { role: string; content: string }[];
}

/* ── API calls ────────────────────────────────────────────────────── */

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

  strategies: () => fetchApi<StrategyInfo[]>("/api/strategies"),

  agentLogs: (signature: string, date?: string) =>
    fetchApi<AgentLogs>(
      `/api/agents/${encodeURIComponent(signature)}/logs${
        date ? `?date=${date}` : ""
      }`
    ),
};
