"""
Crypto-only price and position helpers for WSOA.
"""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
load_dotenv()

project_root = Path(__file__).resolve().parents[1]
if str(project_root) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(project_root))
from tools.general_tools import get_config_value

# BITWISE-10 style crypto universe (USDT pairs)
DEFAULT_CRYPTO_SYMBOLS = [
    "BTC-USDT", "ETH-USDT", "XRP-USDT", "SOL-USDT", "ADA-USDT",
    "SUI-USDT", "LINK-USDT", "AVAX-USDT", "LTC-USDT", "DOT-USDT",
]


def get_market_type() -> str:
    """WSOA is crypto-only; return 'crypto' or from config."""
    market = get_config_value("MARKET", None)
    if market in ["crypto", "cn", "us"]:
        return market
    log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
    if "crypto" in (log_path or "").lower():
        return "crypto"
    return "crypto"


def get_merged_file_path(market: str = "crypto") -> Path:
    """Merged price file path. WSOA only uses crypto."""
    base_dir = Path(__file__).resolve().parents[1]
    return base_dir / "data" / "crypto" / "crypto_merged.jsonl"


def _resolve_merged_file_path_for_date(
    today_date: Optional[str], market: str, merged_path: Optional[str] = None
) -> Path:
    if merged_path is not None:
        return Path(merged_path)
    return get_merged_file_path(market)


def is_trading_day(date: str, market: str = "crypto") -> bool:
    """Check if date exists in merged data (crypto trades daily)."""
    merged_file_path = get_merged_file_path(market)
    if not merged_file_path.exists():
        return False
    try:
        with open(merged_file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line.strip())
                    for key, value in data.items():
                        if key.startswith("Time Series") and isinstance(value, dict):
                            if date in value or any(k.startswith(date) for k in value):
                                return True
                            break
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    return False


def get_yesterday_date(
    today_date: str, merged_path: Optional[str] = None, market: str = "crypto"
) -> str:
    """Previous trading date from merged data."""
    if " " in today_date:
        input_dt = datetime.strptime(today_date, "%Y-%m-%d %H:%M:%S")
        date_only = False
    else:
        input_dt = datetime.strptime(today_date, "%Y-%m-%d")
        date_only = True

    merged_file = _resolve_merged_file_path_for_date(today_date, market, merged_path)
    if not merged_file.exists():
        if date_only:
            yesterday_dt = input_dt - timedelta(days=1)
            return yesterday_dt.strftime("%Y-%m-%d")
        yesterday_dt = input_dt - timedelta(hours=1)
        return yesterday_dt.strftime("%Y-%m-%d %H:%M:%S")

    all_timestamps = set()
    with merged_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
                for key, value in doc.items():
                    if key.startswith("Time Series") and isinstance(value, dict):
                        all_timestamps.update(value.keys())
                        break
            except Exception:
                continue

    if not all_timestamps:
        if date_only:
            return (input_dt - timedelta(days=1)).strftime("%Y-%m-%d")
        return (input_dt - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

    previous_timestamp = None
    for ts_str in all_timestamps:
        try:
            ts_dt = datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S") if " " in ts_str else datetime.strptime(ts_str, "%Y-%m-%d")
            if ts_dt < input_dt and (previous_timestamp is None or ts_dt > previous_timestamp):
                previous_timestamp = ts_dt
        except Exception:
            continue

    if previous_timestamp is None:
        if date_only:
            return (input_dt - timedelta(days=1)).strftime("%Y-%m-%d")
        return (input_dt - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    if date_only:
        return previous_timestamp.strftime("%Y-%m-%d")
    return previous_timestamp.strftime("%Y-%m-%d %H:%M:%S")


def get_open_prices(
    today_date: str, symbols: List[str], merged_path: Optional[str] = None, market: str = "crypto"
) -> Dict[str, Optional[float]]:
    """Read open (buy) prices for date from crypto_merged.jsonl."""
    wanted = set(symbols)
    results: Dict[str, Optional[float]] = {}
    merged_file = _resolve_merged_file_path_for_date(today_date, market, merged_path)
    if not merged_file.exists():
        return results

    with merged_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
            except Exception:
                continue
            meta = doc.get("Meta Data", {}) or {}
            sym = meta.get("2. Symbol")
            if sym not in wanted:
                continue
            series = None
            for key, value in doc.items():
                if key.startswith("Time Series"):
                    series = value
                    break
            if not isinstance(series, dict):
                continue
            bar = series.get(today_date)
            if isinstance(bar, dict):
                open_val = bar.get("1. buy price")
                try:
                    results[f"{sym}_price"] = float(open_val) if open_val is not None else None
                except Exception:
                    results[f"{sym}_price"] = None
    return results


def get_yesterday_open_and_close_price(
    today_date: str, symbols: List[str], merged_path: Optional[str] = None, market: str = "crypto"
) -> Tuple[Dict[str, Optional[float]], Dict[str, Optional[float]]]:
    """Yesterday open and close (sell) prices for symbols."""
    wanted = set(symbols)
    buy_results: Dict[str, Optional[float]] = {}
    sell_results: Dict[str, Optional[float]] = {}
    merged_file = _resolve_merged_file_path_for_date(today_date, market, merged_path)
    if not merged_file.exists():
        return buy_results, sell_results

    yesterday_date = get_yesterday_date(today_date, merged_path=merged_path, market=market)
    with merged_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
            except Exception:
                continue
            meta = doc.get("Meta Data", {}) or {}
            sym = meta.get("2. Symbol")
            if sym not in wanted:
                continue
            series = None
            for key, value in doc.items():
                if key.startswith("Time Series"):
                    series = value
                    break
            if not isinstance(series, dict):
                continue
            bar = series.get(yesterday_date)
            if isinstance(bar, dict):
                buy_val = bar.get("1. buy price")
                sell_val = bar.get("4. sell price")
                try:
                    buy_results[f"{sym}_price"] = float(buy_val) if buy_val else None
                    sell_results[f"{sym}_price"] = float(sell_val) if sell_val else None
                except Exception:
                    buy_results[f"{sym}_price"] = None
                    sell_results[f"{sym}_price"] = None
            else:
                buy_results[f"{sym}_price"] = None
                sell_results[f"{sym}_price"] = None
    return buy_results, sell_results


def get_today_init_position(today_date: str, signature: str) -> Dict[str, float]:
    """Initial positions at start of today (last record before today)."""
    base_dir = Path(__file__).resolve().parents[1]
    log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
    if os.path.isabs(log_path or ""):
        position_file = Path(log_path) / signature / "position" / "position.jsonl"
    else:
        log_rel = (log_path or "").replace("./data/", "")
        position_file = base_dir / "data" / (log_rel or "agent_data_crypto") / signature / "position" / "position.jsonl"

    if not position_file.exists():
        return {}

    market = get_market_type()
    yesterday_date = get_yesterday_date(today_date, market=market)
    all_records = []
    with position_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
                if doc.get("date") and doc.get("date") < today_date:
                    all_records.append(doc)
            except Exception:
                continue
    if not all_records:
        return {}
    all_records.sort(key=lambda x: (x.get("date", ""), x.get("id", 0)), reverse=True)
    return all_records[0].get("positions", {})


def get_latest_position(today_date: str, signature: str) -> Tuple[Dict[str, float], int]:
    """Latest position and max id for today or previous trading day."""
    base_dir = Path(__file__).resolve().parents[1]
    log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
    if os.path.isabs(log_path or ""):
        position_file = Path(log_path) / signature / "position" / "position.jsonl"
    else:
        log_rel = (log_path or "").replace("./data/", "")
        position_file = base_dir / "data" / (log_rel or "agent_data_crypto") / signature / "position" / "position.jsonl"

    if not position_file.exists():
        return {}, -1

    market = get_market_type()
    max_id_today, latest_today = -1, {}
    with position_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
                if doc.get("date") == today_date and doc.get("id", -1) > max_id_today:
                    max_id_today = doc.get("id", -1)
                    latest_today = doc.get("positions", {})
            except Exception:
                continue
    if max_id_today >= 0 and latest_today:
        return latest_today, max_id_today

    prev_date = get_yesterday_date(today_date, market=market)
    max_id_prev, latest_prev = -1, {}
    with position_file.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
                if doc.get("date") == prev_date and doc.get("id", -1) > max_id_prev:
                    max_id_prev = doc.get("id", -1)
                    latest_prev = doc.get("positions", {})
            except Exception:
                continue
    return latest_prev, max_id_prev


def add_no_trade_record(today_date: str, signature: str) -> None:
    """Append a no-trade position record for today."""
    current_position, current_action_id = get_latest_position(today_date, signature)
    save_item = {
        "date": today_date,
        "id": current_action_id + 1,
        "this_action": {"action": "no_trade", "symbol": "", "amount": 0},
        "positions": current_position,
    }
    base_dir = Path(__file__).resolve().parents[1]
    log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
    if os.path.isabs(log_path or ""):
        position_file = Path(log_path) / signature / "position" / "position.jsonl"
    else:
        log_rel = (log_path or "").replace("./data/", "")
        position_file = base_dir / "data" / (log_rel or "agent_data_crypto") / signature / "position" / "position.jsonl"
    position_file.parent.mkdir(parents=True, exist_ok=True)
    with position_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(save_item) + "\n")
