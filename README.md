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

## Quick start

```bash
# Install
pip install -r requirements.txt
cp .env.example .env   # set OPENAI_API_KEY, ALPHAADVANTAGE_API_KEY

# Fetch crypto price data (writes data/crypto/coin/*.json and data/crypto/crypto_merged.jsonl)
python scripts/fetch_crypto_data.py

# Start MCP services (keep running in a separate terminal)
python agent_tools/start_mcp_services.py

# Run agent(s) from config
python main.py configs/league_config.json
```

Metrics for a run can be computed with:

```bash
python -c "
from tools.calculate_metrics import load_position_data, load_all_price_files, calculate_portfolio_values, calculate_metrics
positions = load_position_data('data/agent_data_crypto/SIGNATURE/position/position.jsonl')
prices = load_all_price_files('data/crypto', is_crypto=True)
df = calculate_portfolio_values(positions, prices, is_crypto=True)
print(calculate_metrics(df, periods_per_year=365))
"
```
Replace `SIGNATURE` with the agent signature from config (e.g. `gpt-4o-mini`).

## Web app (TypeScript)

The web app is a Vite + React + TypeScript frontend that talks to a small FastAPI backend.

**Backend (Python)** — serves leaderboard, agent detail, and compare from `data/agent_data_crypto`:

```bash
# From repo root, with venv activated
uvicorn api.main:app --reload --port 8006
```

**Frontend** — in a second terminal:

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server proxies `/api` to `http://localhost:8006`, so the frontend connects to the Python backend automatically.

**Build for production:** Set `VITE_API_URL` to your deployed API URL (e.g. `https://api.example.com`), then `npm run build`. Serve the `web/dist` output with any static host.

## License

MIT (or as you prefer).
