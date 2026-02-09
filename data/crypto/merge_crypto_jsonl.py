"""Merge coin/*.json into crypto_merged.jsonl with buy/sell price fields."""
import glob
import json
import os
from pathlib import Path

SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "ADA", "SUI", "LINK", "AVAX", "LTC", "DOT"]

def main():
    script_dir = Path(__file__).resolve().parent
    coin_dir = script_dir / "coin"
    if not coin_dir.exists():
        print("Run get_daily_price_crypto.py first to create data/crypto/coin/")
        return
    pattern = str(coin_dir / "daily_prices_*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print("No daily_prices_*.json files in data/crypto/coin/")
        return
    out_path = script_dir / "crypto_merged.jsonl"
    with open(out_path, "w", encoding="utf-8") as fout:
        for fp in files:
            base = os.path.basename(fp)
            if not any(s in base for s in SYMBOLS):
                continue
            with open(fp, "r") as f:
                data = json.load(f)
            series = None
            for k, v in data.items():
                if k.startswith("Time Series"):
                    series = v
                    break
            if series:
                latest = max(series.keys())
                bar = series[latest]
                if isinstance(bar, dict) and len(bar) > 1:
                    series[latest] = {"1. buy price": bar.get("1. buy price")}
            meta = data.get("Meta Data", {})
            sym = meta.get("2. Symbol", "")
            if sym and not sym.endswith("-USDT"):
                meta["2. Symbol"] = f"{sym}-USDT"
            fout.write(json.dumps(data, ensure_ascii=False) + "\n")
    print(f"Wrote {out_path} ({len(files)} symbols)")

if __name__ == "__main__":
    main()
