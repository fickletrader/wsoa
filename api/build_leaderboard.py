"""
Build leaderboard from data/agent_data_crypto: scan each signature dir,
compute metrics, return ranked list. Used by FastAPI and by compare_strategies script.
"""
import json
import sys
from pathlib import Path

# Run from repo root so tools and data paths resolve
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.calculate_metrics import (
    load_position_data,
    load_all_price_files,
    calculate_portfolio_values,
    calculate_metrics,
)


def get_agent_data_root():
    return REPO_ROOT / "data" / "agent_data_crypto"


def get_price_data_dir():
    return REPO_ROOT / "data" / "crypto"


def list_signatures():
    """List all agent signatures that have position data."""
    root = get_agent_data_root()
    if not root.exists():
        return []
    signatures = []
    for path in root.iterdir():
        if path.is_dir() and (path / "position" / "position.jsonl").exists():
            signatures.append(path.name)
    return sorted(signatures)


def build_leaderboard(sort_by="CR"):
    """
    Build leaderboard: one row per signature with metrics.
    sort_by: "CR" | "SR" | "Vol" | "MDD" (default CR descending = best return first)
    """
    signatures = list_signatures()
    price_data = load_all_price_files(str(get_price_data_dir()), is_crypto=True)
    rows = []
    for sig in signatures:
        pos_file = get_agent_data_root() / sig / "position" / "position.jsonl"
        try:
            positions = load_position_data(str(pos_file))
            if not positions:
                continue
            df = calculate_portfolio_values(positions, price_data, is_crypto=True)
            metrics = calculate_metrics(df, periods_per_year=365)
            rows.append({
                "signature": sig,
                "strategy_id": sig.split("-")[-1] if "-" in sig else "default",
                "model": sig,
                "cr": float(metrics["CR"]),
                "sortino": float(metrics["SR"]) if abs(metrics["SR"]) != float("inf") else None,
                "vol": float(metrics["Vol"]),
                "mdd": float(metrics["MDD"]),
                "initial_value": metrics["Initial Value"],
                "final_value": metrics["Final Value"],
                "total_positions": metrics["Total Positions"],
                "date_range": metrics["Date Range"],
            })
        except Exception as e:
            rows.append({
                "signature": sig,
                "error": str(e),
                "cr": None,
                "sortino": None,
                "vol": None,
                "mdd": None,
            })
    # Sort: best CR first (descending); put errors last
    def sort_key(r):
        if r.get("cr") is None:
            return (1, 0)
        return (0, -(r.get("cr") or -1e9))
    rows.sort(key=sort_key)
    return rows


def get_agent_detail(signature):
    """Single agent: metrics + equity curve (daily values) + recent trades from position.jsonl."""
    root = get_agent_data_root()
    pos_file = root / signature / "position" / "position.jsonl"
    if not pos_file.exists():
        return None
    try:
        positions = load_position_data(str(pos_file))
        if not positions:
            return None
        price_data = load_all_price_files(str(get_price_data_dir()), is_crypto=True)
        df = calculate_portfolio_values(positions, price_data, is_crypto=True)
        metrics = calculate_metrics(df, periods_per_year=365)
        # Equity curve: list of { date, total_value }
        equity_curve = [
            {"date": row["date"].strftime("%Y-%m-%d"), "total_value": row["total_value"]}
            for _, row in df.iterrows()
        ]
        # Recent trades: entries that have this_action with action != no_trade
        trades = []
        for p in positions:
            action = (p.get("this_action") or {}).get("action")
            if action and action != "no_trade":
                trades.append({
                    "date": p.get("date"),
                    "action": action,
                    "symbol": (p.get("this_action") or {}).get("symbol"),
                    "amount": (p.get("this_action") or {}).get("amount"),
                })
        return {
            "signature": signature,
            "metrics": {
                "cr": float(metrics["CR"]),
                "sortino": float(metrics["SR"]) if abs(metrics["SR"]) != float("inf") else None,
                "vol": float(metrics["Vol"]),
                "mdd": float(metrics["MDD"]),
                "initial_value": metrics["Initial Value"],
                "final_value": metrics["Final Value"],
                "total_positions": metrics["Total Positions"],
                "date_range": metrics["Date Range"],
            },
            "equity_curve": equity_curve,
            "trades": trades[-50:],  # last 50 trades
        }
    except Exception as e:
        return {"signature": signature, "error": str(e)}
