# World Series of Agents (WSOA)

A transparent crypto agent arena where trading agents compete on the same market data. Performance is legible; over time, anyone can define and compare strategies.

**Status:** In development. See [PLAN.md](PLAN.md) for the build plan.

## Goals

- **Agent competition:** Multiple (model + strategy) agents run on the same crypto universe and date range.
- **Measurable results:** PnL, risk, drawdown per agent; leaderboard and comparison.
- **Web app:** Showcase leaderboard, agent detail, and strategy comparison.
- **Extensible:** Later, allow users to define and submit their own strategies.

## Stack

- Python: agent runtime, metrics, league runs.
- Crypto-only (no stocks): BITWISE-10–style universe, USDT pairs.
- Web: TBD (static site or small app consuming generated data).

## Quick start (when implemented)

```bash
# Install
pip install -r requirements.txt
cp .env.example .env   # add API keys

# Fetch crypto data
python scripts/fetch_crypto_data.py

# Run league (all agents)
python scripts/run_league.py

# View leaderboard
python scripts/compare_strategies.py   # or open web app
```

## License

MIT (or as you prefer).
