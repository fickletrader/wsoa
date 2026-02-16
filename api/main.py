"""
WSOA FastAPI backend: leaderboard, agent detail, compare.
Run from repo root: uvicorn api.main:app --reload --port 8000
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.build_leaderboard import build_leaderboard, get_agent_detail, get_agent_logs, list_signatures
from strategies.registry import list_strategies

app = FastAPI(title="WSOA API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/leaderboard")
def leaderboard(sort_by: str = "CR"):
    """Ranked list of agents with metrics (CR, Sortino, Vol, MDD)."""
    return build_leaderboard(sort_by=sort_by)


@app.get("/api/agents")
def agents():
    """List all agent signatures."""
    return list_signatures()


@app.get("/api/agents/{signature}")
def agent_detail(signature: str):
    """Single agent: metrics, equity curve, recent trades."""
    detail = get_agent_detail(signature)
    if detail is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    if "error" in detail:
        raise HTTPException(status_code=500, detail=detail["error"])
    return detail


@app.get("/api/agents/{signature}/logs")
def agent_logs(signature: str, date: str | None = None):
    """Reasoning traces / conversation logs for an agent."""
    result = get_agent_logs(signature, date)
    if result is None:
        raise HTTPException(status_code=404, detail="No logs found for agent")
    return result


@app.get("/api/strategies")
def strategies():
    """List all available strategies with metadata."""
    return list_strategies()


@app.get("/api/compare")
def compare(signatures: str):
    """Compare 2–3 agents; comma-separated signatures. Returns leaderboard subset + details."""
    sig_list = [s.strip() for s in signatures.split(",") if s.strip()][:3]
    if not sig_list:
        raise HTTPException(status_code=400, detail="Provide signatures= sig1,sig2")
    result = []
    for sig in sig_list:
        d = get_agent_detail(sig)
        if d and "error" not in d:
            result.append(d)
        elif d:
            result.append({"signature": sig, "error": d["error"]})
    return result
