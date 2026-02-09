#!/usr/bin/env python3
"""Fetch crypto prices and merge into crypto_merged.jsonl. Requires ALPHAADVANTAGE_API_KEY."""
import os
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

# Run fetch: load module and call fetch_one for each symbol
data_crypto = project_root / "data" / "crypto"
get_daily_path = data_crypto / "get_daily_price_crypto.py"
import importlib.util
spec = importlib.util.spec_from_file_location("get_daily", get_daily_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
for symbol in getattr(mod, "SYMBOLS", ["BTC", "ETH", "SOL", "XRP", "ADA", "SUI", "LINK", "AVAX", "LTC", "DOT"]):
    mod.fetch_one(symbol)

# Run merge
merge_path = data_crypto / "merge_crypto_jsonl.py"
spec2 = importlib.util.spec_from_file_location("merge", merge_path)
mod2 = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(mod2)
mod2.main()
