#!/usr/bin/env python3
"""
WSOA main entry: run crypto agent(s) from config.
Usage: python main.py [config_path]
Default config: configs/league_config.json
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

project_root = Path(__file__).resolve().parent
load_dotenv(project_root / ".env")
sys.path.insert(0, str(project_root))


def load_config(path=None):
    if path is None:
        path = project_root / "configs" / "league_config.json"
    else:
        path = Path(path)
    if not path.exists():
        print(f"Config not found: {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_agent_class():
    from agent.crypto_agent import CryptoAgent
    return CryptoAgent


async def main(config_path=None):
    config = load_config(config_path)
    agent_type = config.get("agent_type", "CryptoAgent")
    if agent_type != "CryptoAgent":
        print("Only CryptoAgent is supported. Set agent_type to CryptoAgent.")
        sys.exit(1)

    AgentClass = get_agent_class()
    date_range = config["date_range"]
    init_date = date_range["init_date"]
    end_date = date_range["end_date"]
    log_config = config.get("log_config", {})
    log_path = log_config.get("log_path", "./data/agent_data_crypto")
    agent_config = config.get("agent_config", {})
    initial_cash = agent_config.get("initial_cash", 50000)
    max_steps = agent_config.get("max_steps", 30)
    max_retries = agent_config.get("max_retries", 3)
    base_delay = agent_config.get("base_delay", 1)

    models = [m for m in config.get("models", []) if m.get("enabled", True)]
    if not models:
        print("No enabled models in config.")
        sys.exit(1)

    for model_cfg in models:
        name = model_cfg.get("name", "agent")
        basemodel = model_cfg.get("basemodel")
        signature = model_cfg.get("signature", name)
        if not basemodel:
            print(f"Skip {name}: missing basemodel")
            continue
        openai_base_url = model_cfg.get("openai_base_url") or os.getenv("OPENAI_API_BASE")
        openai_api_key = model_cfg.get("openai_api_key") or os.getenv("OPENAI_API_KEY")

        agent = AgentClass(
            signature=signature,
            basemodel=basemodel,
            log_path=log_path,
            max_steps=max_steps,
            max_retries=max_retries,
            base_delay=base_delay,
            initial_cash=initial_cash,
            init_date=init_date,
            openai_base_url=openai_base_url,
            openai_api_key=openai_api_key,
        )
        await agent.initialize()
        await agent.run_date_range(init_date, end_date)
        summary = agent.get_position_summary()
        print("Summary:", summary.get("latest_date"), "Records:", summary.get("total_records"))
        print("Cash:", summary.get("positions", {}).get("CASH"))

    print("Done.")


if __name__ == "__main__":
    cfg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(cfg))
