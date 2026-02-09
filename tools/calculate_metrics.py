#!/usr/bin/env python3
"""
Calculate trading performance metrics from position data.
Metrics: CR, Sortino, Vol, MDD.
"""
import json
import numpy as np
import pandas as pd
from pathlib import Path


def load_position_data(position_file):
    positions = []
    with open(position_file, "r") as f:
        for line in f:
            if line.strip():
                positions.append(json.loads(line))
    return positions


def get_price_at_date(price_data, symbol, date_str, is_crypto=False):
    if symbol not in price_data:
        return None
    symbol_data = price_data[symbol]
    time_series_key = None
    for key in ["Time Series (60min)", "Time Series (Daily)", "Time Series (Hourly)"]:
        if key in symbol_data:
            time_series_key = key
            break
    if not time_series_key:
        return None
    time_series = symbol_data[time_series_key]
    date_only = date_str.split(" ")[0]
    if date_only in time_series:
        bar = time_series[date_only]
        price_str = bar.get("4. sell price" if is_crypto else "4. close", bar.get("4. close"))
        return float(price_str) if price_str else None
    available = sorted([d for d in time_series.keys() if d <= date_only], reverse=True)
    if available:
        bar = time_series[available[0]]
        price_str = bar.get("4. sell price" if is_crypto else "4. close", bar.get("4. close"))
        return float(price_str) if price_str else None
    return None


def load_all_price_files(data_dir, is_crypto=True, is_astock=False):
    price_data = {}
    price_dir = Path(data_dir) / "coin" if is_crypto else Path(data_dir)
    for price_file in price_dir.glob("daily_prices_*.json"):
        symbol = price_file.stem.replace("daily_prices_", "")
        try:
            with open(price_file, "r") as f:
                data = json.load(f)
                price_data[symbol] = data
                if is_crypto:
                    price_data[f"{symbol}-USDT"] = data
        except Exception as e:
            print(f"Warning: {price_file}: {e}")
    return price_data


def calculate_portfolio_values(positions, price_data, is_crypto=True, verbose=False):
    portfolio_values = []
    for entry in positions:
        date = entry["date"]
        pos = entry["positions"]
        cash = pos.get("CASH", 0)
        stock_value = 0
        for symbol, amount in pos.items():
            if symbol == "CASH" or amount == 0:
                continue
            price = get_price_at_date(price_data, symbol, date, is_crypto)
            if price is not None:
                stock_value += amount * price
        portfolio_values.append({
            "date": date,
            "cash": cash,
            "stock_value": stock_value,
            "total_value": cash + stock_value,
        })
    df = pd.DataFrame(portfolio_values)
    df["date"] = pd.to_datetime(df["date"])
    return df


def calculate_metrics(portfolio_df, periods_per_year=365, risk_free_rate=0.0):
    values = portfolio_df["total_value"].values
    returns = np.diff(values) / values[:-1]
    cr = (values[-1] - values[0]) / values[0]
    num_periods = len(returns)
    years = num_periods / periods_per_year
    annualized_return = (1 + cr) ** (1 / years) - 1 if years > 0 else 0
    vol = np.std(returns) * np.sqrt(periods_per_year) if len(returns) > 1 else 0
    excess_return = np.mean(returns) - (risk_free_rate / periods_per_year)
    sharpe = (excess_return / np.std(returns) * np.sqrt(periods_per_year)) if np.std(returns) > 0 else 0
    negative_returns = returns[returns < 0]
    downside_std = np.std(negative_returns) if len(negative_returns) > 0 else 0
    sortino = excess_return / downside_std * np.sqrt(periods_per_year) if downside_std > 0 else (float("inf") if np.mean(returns) > 0 else 0)
    cumulative = np.cumprod(1 + returns)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - running_max) / running_max
    mdd = np.min(drawdown)
    return {
        "CR": cr,
        "Annualized Return": annualized_return,
        "SR": sortino,
        "Sharpe Ratio": sharpe,
        "Vol": vol,
        "MDD": mdd,
        "Initial Value": float(values[0]),
        "Final Value": float(values[-1]),
        "Total Positions": len(portfolio_df),
        "Date Range": f"{portfolio_df['date'].iloc[0]} to {portfolio_df['date'].iloc[-1]}",
    }
