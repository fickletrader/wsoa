"""Crypto-only local price tool for WSOA."""
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from fastmcp import FastMCP

project_root = Path(__file__).resolve().parents[1]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
load_dotenv()

from tools.general_tools import get_config_value

mcp = FastMCP("LocalPrices")

DATA_PATH = project_root / "data" / "crypto" / "crypto_merged.jsonl"


def _validate_date_daily(date_str: str) -> None:
    datetime.strptime(date_str, "%Y-%m-%d")


@mcp.tool()
def get_price_local(symbol: str, date: str) -> Dict[str, Any]:
    """Read OHLCV for crypto symbol and date from local data.
    Args:
        symbol: Crypto symbol e.g. 'BTC-USDT', 'ETH-USDT'.
        date: Date 'YYYY-MM-DD'.
    Returns:
        Dict with symbol, date, ohlcv (open, high, low, close, volume).
    """
    try:
        _validate_date_daily(date)
    except ValueError as e:
        return {"error": str(e), "symbol": symbol, "date": date}

    if not DATA_PATH.exists():
        return {"error": f"Data file not found: {DATA_PATH}", "symbol": symbol, "date": date}

    with DATA_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            doc = json.loads(line)
            meta = doc.get("Meta Data", {})
            if meta.get("2. Symbol") != symbol:
                continue
            series = doc.get("Time Series (Daily)", {})
            day = series.get(date)
            if day is None:
                sample = sorted(series.keys(), reverse=True)[:5]
                return {"error": f"Date {date} not in data. Sample: {sample}", "symbol": symbol, "date": date}
            if date == get_config_value("TODAY_DATE"):
                return {
                    "symbol": symbol,
                    "date": date,
                    "ohlcv": {
                        "open": day.get("1. buy price"),
                        "high": "You can not get the current high price",
                        "low": "You can not get the current low price",
                        "close": "You can not get the next close price",
                        "volume": "You can not get the current volume",
                    },
                }
            return {
                "symbol": symbol,
                "date": date,
                "ohlcv": {
                    "open": day.get("1. buy price"),
                    "high": day.get("2. high"),
                    "low": day.get("3. low"),
                    "close": day.get("4. sell price"),
                    "volume": day.get("5. volume"),
                },
            }
    return {"error": f"No records for {symbol}", "symbol": symbol, "date": date}


if __name__ == "__main__":
    port = int(os.getenv("GETPRICE_HTTP_PORT", "8003"))
    mcp.run(transport="streamable-http", port=port)
