import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()


def _resolve_runtime_env_path() -> str:
    """Resolve runtime env path from RUNTIME_ENV_PATH in .env file."""
    path = os.environ.get("RUNTIME_ENV_PATH")
    if not path:
        path = "data/.runtime_env.json"
    if not os.path.isabs(path):
        base_dir = Path(__file__).resolve().parents[1]
        path = str(base_dir / path)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_runtime_env() -> dict:
    path = _resolve_runtime_env_path()
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception:
        pass
    return {}


def get_config_value(key: str, default=None):
    _RUNTIME_ENV = _load_runtime_env()
    if key in _RUNTIME_ENV:
        return _RUNTIME_ENV[key]
    return os.getenv(key, default)


def write_config_value(key: str, value: Any):
    path = _resolve_runtime_env_path()
    _RUNTIME_ENV = _load_runtime_env()
    _RUNTIME_ENV[key] = value
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(_RUNTIME_ENV, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error writing config to {path}: {e}")


def extract_conversation(conversation: dict, output_type: str):
    """Extract information from a conversation payload."""
    def get_field(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    def get_nested(obj, path, default=None):
        current = obj
        for key in path:
            current = get_field(current, key, None)
            if current is None:
                return default
        return current

    messages = get_field(conversation, "messages", []) or []

    if output_type == "all":
        return messages

    if output_type == "final":
        for msg in reversed(messages):
            finish_reason = get_nested(msg, ["response_metadata", "finish_reason"])
            content = get_field(msg, "content")
            if finish_reason == "stop" and isinstance(content, str) and content.strip():
                return content
        for msg in reversed(messages):
            content = get_field(msg, "content")
            additional_kwargs = get_field(msg, "additional_kwargs", {}) or {}
            tool_calls = get_field(additional_kwargs, "tool_calls") if isinstance(additional_kwargs, dict) else getattr(additional_kwargs, "tool_calls", None)
            has_tool_call_id = get_field(msg, "tool_call_id") is not None
            tool_name = get_field(msg, "name")
            is_tool_message = has_tool_call_id or isinstance(tool_name, str)
            if not tool_calls and not is_tool_message and isinstance(content, str) and content.strip():
                return content
        return None

    raise ValueError("output_type must be 'final' or 'all'")


def extract_tool_messages(conversation: dict):
    """Return all ToolMessage-like entries from the conversation."""
    def get_field(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    def get_nested(obj, path, default=None):
        current = obj
        for key in path:
            current = get_field(current, key, None)
            if current is None:
                return default
        return current

    messages = get_field(conversation, "messages", []) or []
    tool_messages = []
    for msg in messages:
        tool_call_id = get_field(msg, "tool_call_id")
        name = get_field(msg, "name")
        finish_reason = get_nested(msg, ["response_metadata", "finish_reason"])
        if tool_call_id or (isinstance(name, str) and not finish_reason):
            tool_messages.append(msg)
    return tool_messages
