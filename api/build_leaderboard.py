"""
Build leaderboard from data/agent_data_crypto: scan each signature dir,
compute metrics, return ranked list. Used by FastAPI and by compare_strategies script.
"""
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.calculate_metrics import (
    load_position_data,
    load_all_price_files,
    calculate_portfolio_values,
    calculate_metrics,
)


def _safe_float(v, default=None):
    """Convert to float, returning default for NaN/inf."""
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def get_agent_data_root():
    return REPO_ROOT / "data" / "agent_data_crypto"


def get_price_data_dir():
    return REPO_ROOT / "data" / "crypto"


def _read_agent_meta(sig_dir: Path) -> dict:
    """Read agent_meta.json if it exists, else infer from signature."""
    meta_file = sig_dir / "agent_meta.json"
    if meta_file.exists():
        with open(meta_file, "r") as f:
            return json.load(f)
    # Fallback: parse signature convention  name--model
    sig = sig_dir.name
    if "--" in sig:
        name_part, model_part = sig.split("--", 1)
        return {
            "signature": sig,
            "display_name": name_part.title(),
            "basemodel": model_part,
            "strategy_id": name_part,
            "strategy_description": "",
        }
    return {
        "signature": sig,
        "display_name": sig,
        "basemodel": sig,
        "strategy_id": "default",
        "strategy_description": "",
    }


def _get_strategy_prompt(strategy_id: str) -> str:
    """Load the raw prompt text for a strategy so it can be shown in the UI."""
    try:
        from strategies.registry import get_strategy
        mod = get_strategy(strategy_id)
        return getattr(mod, "agent_system_prompt_crypto", "")
    except Exception:
        return ""


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
    Build leaderboard: one row per signature with metrics + metadata.
    sort_by: "CR" | "SR" | "Vol" | "MDD"
    """
    signatures = list_signatures()
    price_data = load_all_price_files(str(get_price_data_dir()), is_crypto=True)
    rows = []
    for sig in signatures:
        sig_dir = get_agent_data_root() / sig
        pos_file = sig_dir / "position" / "position.jsonl"
        meta = _read_agent_meta(sig_dir)
        try:
            positions = load_position_data(str(pos_file))
            if not positions:
                continue
            df = calculate_portfolio_values(positions, price_data, is_crypto=True)
            metrics = calculate_metrics(df, periods_per_year=365)
            rows.append({
                "signature": sig,
                "display_name": meta.get("display_name", sig),
                "basemodel": meta.get("basemodel", ""),
                "strategy_id": meta.get("strategy_id", "default"),
                "strategy_description": meta.get("strategy_description", ""),
                "cr": _safe_float(metrics["CR"]),
                "sortino": _safe_float(metrics["SR"]),
                "vol": _safe_float(metrics["Vol"]),
                "mdd": _safe_float(metrics["MDD"]),
                "initial_value": _safe_float(metrics["Initial Value"], 0),
                "final_value": _safe_float(metrics["Final Value"], 0),
                "total_positions": metrics["Total Positions"],
                "date_range": metrics["Date Range"],
            })
        except Exception as e:
            rows.append({
                "signature": sig,
                "display_name": meta.get("display_name", sig),
                "basemodel": meta.get("basemodel", ""),
                "strategy_id": meta.get("strategy_id", "default"),
                "error": str(e),
                "cr": None,
                "sortino": None,
                "vol": None,
                "mdd": None,
            })
    # Sort: best CR first (descending); errors last
    def sort_key(r):
        if r.get("cr") is None:
            return (1, 0)
        return (0, -(r.get("cr") or -1e9))
    rows.sort(key=sort_key)
    return rows


def get_agent_detail(signature):
    """Single agent: metrics + equity curve + trades + metadata + prompt."""
    root = get_agent_data_root()
    sig_dir = root / signature
    pos_file = sig_dir / "position" / "position.jsonl"
    if not pos_file.exists():
        return None
    meta = _read_agent_meta(sig_dir)
    try:
        positions = load_position_data(str(pos_file))
        if not positions:
            return None
        price_data = load_all_price_files(str(get_price_data_dir()), is_crypto=True)
        df = calculate_portfolio_values(positions, price_data, is_crypto=True)
        metrics = calculate_metrics(df, periods_per_year=365)
        equity_curve = [
            {"date": row["date"].strftime("%Y-%m-%d"), "total_value": row["total_value"]}
            for _, row in df.iterrows()
        ]
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
        strategy_id = meta.get("strategy_id", "default")
        return {
            "signature": signature,
            "display_name": meta.get("display_name", signature),
            "basemodel": meta.get("basemodel", ""),
            "strategy_id": strategy_id,
            "strategy_description": meta.get("strategy_description", ""),
            "strategy_prompt": _get_strategy_prompt(strategy_id),
            "metrics": {
                "cr": _safe_float(metrics["CR"], 0),
                "sortino": _safe_float(metrics["SR"]),
                "vol": _safe_float(metrics["Vol"], 0),
                "mdd": _safe_float(metrics["MDD"], 0),
                "initial_value": _safe_float(metrics["Initial Value"], 0),
                "final_value": _safe_float(metrics["Final Value"], 0),
                "total_positions": metrics["Total Positions"],
                "date_range": metrics["Date Range"],
            },
            "equity_curve": [
                {"date": e["date"], "total_value": _safe_float(e["total_value"], 0)}
                for e in equity_curve
            ],
            "trades": trades[-50:],
        }
    except Exception as e:
        return {"signature": signature, "error": str(e)}


def get_agent_logs(signature: str, date: str | None = None):
    """Return reasoning logs for an agent.

    If date is given, return logs for that specific date.
    Otherwise return a list of available dates + the latest day's logs.
    """
    root = get_agent_data_root()
    log_dir = root / signature / "log"
    if not log_dir.exists():
        return None

    # Collect available dates
    dates = sorted(
        [d.name for d in log_dir.iterdir() if d.is_dir() and (d / "log.jsonl").exists()]
    )
    if not dates:
        return {"signature": signature, "dates": [], "logs": []}

    target_date = date if date and date in dates else dates[-1]
    log_file = log_dir / target_date / "log.jsonl"

    entries: list[dict] = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                for msg in obj.get("new_messages", []):
                    content = msg.get("content", "")
                    # Strip the FINISH_SIGNAL tag for cleaner display
                    content = content.replace("<FINISH_SIGNAL>", "").strip()
                    if content:
                        entries.append({
                            "role": msg["role"],
                            "content": content,
                        })
            except json.JSONDecodeError:
                continue

    return {
        "signature": signature,
        "dates": dates,
        "selected_date": target_date,
        "logs": entries,
    }
