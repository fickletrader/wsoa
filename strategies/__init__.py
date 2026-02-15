# Strategy modules for WSOA agents.
# Each module exports: DISPLAY_NAME, DESCRIPTION, STOP_SIGNAL, get_agent_system_prompt_crypto()

from strategies.registry import get_strategy, list_strategies

__all__ = ["get_strategy", "list_strategies"]
