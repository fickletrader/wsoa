"""Strategy registry — maps strategy_id to its module."""
import importlib
from typing import Any, Dict

STRATEGY_MAP: Dict[str, str] = {
    "warren": "strategies.warren",
    "degen_spartan": "strategies.degen_spartan",
    "satoshi_oracle": "strategies.satoshi_oracle",
    "default": "prompts.agent_prompt_crypto",
}


def get_strategy(strategy_id: str) -> Any:
    """Load and return a strategy module by its id."""
    module_path = STRATEGY_MAP.get(strategy_id)
    if module_path is None:
        raise ValueError(
            f"Unknown strategy_id '{strategy_id}'. "
            f"Available: {list(STRATEGY_MAP.keys())}"
        )
    return importlib.import_module(module_path)


def list_strategies() -> list:
    """Return metadata for all registered strategies."""
    result = []
    for sid, module_path in STRATEGY_MAP.items():
        mod = importlib.import_module(module_path)
        result.append({
            "strategy_id": sid,
            "display_name": getattr(mod, "DISPLAY_NAME", sid),
            "description": getattr(mod, "DESCRIPTION", ""),
        })
    return result
