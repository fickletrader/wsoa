"""Fetch crypto daily prices from Alpha Vantage (USD as USDT proxy)."""
import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "ADA", "SUI", "LINK", "AVAX", "LTC", "DOT"]


def convert_to_standard(data, symbol):
    ts = data.get("Time Series (Digital Currency Daily)", {})
    out = {
        "Meta Data": {
            "1. Information": "Daily Prices (buy price, high, low, sell price) and Volumes",
            "2. Symbol": symbol,
            "3. Last Refreshed": data.get("Meta Data", {}).get("6. Last Refreshed"),
            "4. Output Size": "Compact",
            "5. Time Zone": data.get("Meta Data", {}).get("7. Time Zone", "UTC"),
        },
        "Time Series (Daily)": {},
    }
    for date, v in ts.items():
        out["Time Series (Daily)"][date] = {
            "1. buy price": v.get("1a. open (USD)", v.get("1. open", "0")),
            "2. high": v.get("2a. high (USD)", v.get("2. high", "0")),
            "3. low": v.get("3a. low (USD)", v.get("3. low", "0")),
            "4. sell price": v.get("4a. close (USD)", v.get("4. close", "0")),
            "5. volume": v.get("5. volume", "0"),
        }
    out["Time Series (Daily)"] = dict(sorted(out["Time Series (Daily)"].items(), reverse=True))
    return out


def fetch_one(symbol, delay_seconds=12):
    key = os.getenv("ALPHAADVANTAGE_API_KEY")
    if not key:
        print("Set ALPHAADVANTAGE_API_KEY")
        return None
    url = f"https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol={symbol}&market=USD&apikey={key}"
    try:
        r = requests.get(url, timeout=30)
        data = r.json()
        if data.get("Note") or data.get("Information"):
            print(f"API limit or error for {symbol}")
            return None
        if "Time Series (Digital Currency Daily)" not in data:
            return None
        std = convert_to_standard(data, symbol)
        script_dir = Path(__file__).resolve().parent
        coin_dir = script_dir / "coin"
        coin_dir.mkdir(exist_ok=True)
        path = coin_dir / f"daily_prices_{symbol}.json"
        with open(path, "w") as f:
            json.dump(std, f, indent=2)
        print(f"Saved {symbol} to {path}")
        return std
    except Exception as e:
        print(f"Error {symbol}: {e}")
        return None
    finally:
        time.sleep(delay_seconds)


if __name__ == "__main__":
    for s in SYMBOLS:
        fetch_one(s)
