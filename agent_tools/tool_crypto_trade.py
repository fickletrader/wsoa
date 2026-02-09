"""Crypto buy/sell MCP tools for WSOA."""
import fcntl
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from tools.general_tools import get_config_value, write_config_value
from tools.price_tools import get_latest_position, get_open_prices

from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

mcp = FastMCP("CryptoTradeTools")


def _position_lock(signature: str):
    class _Lock:
        def __init__(self, name: str):
            log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
            if os.path.isabs(log_path or ""):
                base_dir = Path(log_path) / name
            else:
                log_rel = (log_path or "./data/agent_data_crypto").replace("./data/", "")
                base_dir = project_root / "data" / (log_rel or "agent_data_crypto") / name
            base_dir.mkdir(parents=True, exist_ok=True)
            self.lock_path = base_dir / ".position.lock"
            self._fh = open(self.lock_path, "a+")

        def __enter__(self):
            fcntl.flock(self._fh.fileno(), fcntl.LOCK_EX)
            return self

        def __exit__(self, exc_type, exc, tb):
            try:
                fcntl.flock(self._fh.fileno(), fcntl.LOCK_UN)
            finally:
                self._fh.close()

    return _Lock(signature)


def _position_file_path(signature: str) -> Path:
    log_path = get_config_value("LOG_PATH", "./data/agent_data_crypto")
    if os.path.isabs(log_path or ""):
        return Path(log_path) / signature / "position" / "position.jsonl"
    log_rel = (log_path or "").replace("./data/", "")
    return project_root / "data" / (log_rel or "agent_data_crypto") / signature / "position" / "position.jsonl"


@mcp.tool()
def buy_crypto(symbol: str, amount: float) -> Dict[str, Any]:
    """Buy cryptocurrency. symbol e.g. BTC-USDT, amount in units."""
    signature = get_config_value("SIGNATURE")
    if not signature:
        raise ValueError("SIGNATURE not set")
    today_date = get_config_value("TODAY_DATE")
    market = "crypto"

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"error": f"Invalid amount: {amount}", "symbol": symbol, "date": today_date}
    if amount <= 0:
        return {"error": f"Amount must be positive: {amount}", "symbol": symbol, "date": today_date}

    with _position_lock(signature):
        try:
            current_position, current_action_id = get_latest_position(today_date, signature)
        except Exception as e:
            return {"error": f"Failed to load position: {e}", "symbol": symbol, "date": today_date}

        prices = get_open_prices(today_date, [symbol], market=market)
        this_price = prices.get(f"{symbol}_price")
        if this_price is None:
            return {"error": f"Symbol {symbol} not found", "symbol": symbol, "date": today_date}

        cost = this_price * amount
        cash = current_position.get("CASH", 0)
        if cash < cost:
            return {
                "error": "Insufficient cash",
                "required_cash": round(cost, 4),
                "cash_available": round(cash, 4),
                "symbol": symbol,
                "date": today_date,
            }

        new_position = current_position.copy()
        new_position["CASH"] = round(cash - cost, 4)
        new_position[symbol] = round(new_position.get(symbol, 0) + amount, 4)

        pos_file = _position_file_path(signature)
        pos_file.parent.mkdir(parents=True, exist_ok=True)
        with pos_file.open("a") as f:
            record = {
                "date": today_date,
                "id": current_action_id + 1,
                "this_action": {"action": "buy_crypto", "symbol": symbol, "amount": amount},
                "positions": new_position,
            }
            f.write(json.dumps(record) + "\n")
        write_config_value("IF_TRADE", True)
    return new_position


@mcp.tool()
def sell_crypto(symbol: str, amount: float) -> Dict[str, Any]:
    """Sell cryptocurrency. symbol e.g. BTC-USDT, amount in units."""
    signature = get_config_value("SIGNATURE")
    if not signature:
        raise ValueError("SIGNATURE not set")
    today_date = get_config_value("TODAY_DATE")
    market = "crypto"

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"error": f"Invalid amount: {amount}", "symbol": symbol, "date": today_date}
    if amount <= 0:
        return {"error": f"Amount must be positive: {amount}", "symbol": symbol, "date": today_date}

    with _position_lock(signature):
        try:
            current_position, current_action_id = get_latest_position(today_date, signature)
        except Exception as e:
            return {"error": f"Failed to load position: {e}", "symbol": symbol, "date": today_date}

        if symbol not in current_position or current_position[symbol] < amount:
            return {
                "error": "Insufficient crypto to sell",
                "have": current_position.get(symbol, 0),
                "want_to_sell": amount,
                "symbol": symbol,
                "date": today_date,
            }

        prices = get_open_prices(today_date, [symbol], market=market)
        this_price = prices.get(f"{symbol}_price") or 0

        new_position = current_position.copy()
        new_position[symbol] = round(new_position[symbol] - amount, 4)
        new_position["CASH"] = round(new_position.get("CASH", 0) + this_price * amount, 4)

        pos_file = _position_file_path(signature)
        with pos_file.open("a") as f:
            record = {
                "date": today_date,
                "id": current_action_id + 1,
                "this_action": {"action": "sell_crypto", "symbol": symbol, "amount": amount},
                "positions": new_position,
            }
            f.write(json.dumps(record) + "\n")
        write_config_value("IF_TRADE", True)
    return new_position


if __name__ == "__main__":
    port = int(os.getenv("CRYPTO_HTTP_PORT", "8005"))
    mcp.run(transport="streamable-http", port=port)
