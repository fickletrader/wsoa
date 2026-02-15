"""
CryptoAgent - Cryptocurrency trading agent for WSOA.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI

from prompts.agent_prompt_crypto import STOP_SIGNAL, get_agent_system_prompt_crypto
from tools.general_tools import extract_conversation, extract_tool_messages, get_config_value, write_config_value
from tools.price_tools import add_no_trade_record

load_dotenv()


class DeepSeekChatOpenAI(ChatOpenAI):
    """Handle DeepSeek tool_calls.args as JSON string."""

    def _generate(self, messages, stop=None, **kwargs):
        result = super()._generate(messages, stop, **kwargs)
        for gen in result.generations:
            for g in gen:
                if hasattr(g, "message") and hasattr(g.message, "additional_kwargs"):
                    for tc in (g.message.additional_kwargs.get("tool_calls") or []):
                        if "function" in tc and "arguments" in tc["function"]:
                            a = tc["function"]["arguments"]
                            if isinstance(a, str):
                                try:
                                    tc["function"]["arguments"] = json.loads(a)
                                except json.JSONDecodeError:
                                    pass
        return result

    async def _agenerate(self, messages, stop=None, **kwargs):
        result = await super()._agenerate(messages, stop, **kwargs)
        for gen in result.generations:
            for g in gen:
                if hasattr(g, "message") and hasattr(g.message, "additional_kwargs"):
                    for tc in (g.message.additional_kwargs.get("tool_calls") or []):
                        if "function" in tc and "arguments" in tc["function"]:
                            a = tc["function"]["arguments"]
                            if isinstance(a, str):
                                try:
                                    tc["function"]["arguments"] = json.loads(a)
                                except json.JSONDecodeError:
                                    pass
        return result


class CryptoAgent:
    """Crypto-only trading agent for WSOA."""

    BITWISE_10 = [
        "BTC-USDT", "ETH-USDT", "XRP-USDT", "SOL-USDT", "ADA-USDT",
        "SUI-USDT", "LINK-USDT", "AVAX-USDT", "LTC-USDT", "DOT-USDT",
    ]
    DEFAULT_CRYPTO_SYMBOLS = BITWISE_10

    def __init__(
        self,
        signature: str,
        basemodel: str,
        crypto_symbols: Optional[List[str]] = None,
        mcp_config: Optional[Dict[str, Dict[str, Any]]] = None,
        log_path: Optional[str] = None,
        max_steps: int = 10,
        max_retries: int = 3,
        base_delay: float = 0.5,
        openai_base_url: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        initial_cash: float = 50000.0,
        init_date: str = "2025-11-01",
        market: str = "crypto",
        prompt_fn=None,
        agent_meta: Optional[Dict[str, str]] = None,
    ):
        self.signature = signature
        self.basemodel = basemodel
        self.market = "crypto"
        self.crypto_symbols = crypto_symbols or self.DEFAULT_CRYPTO_SYMBOLS
        self.max_steps = max_steps
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.initial_cash = initial_cash
        self.init_date = init_date
        self.mcp_config = mcp_config or self._get_default_mcp_config()
        self.base_log_path = log_path or "./data/agent_data_crypto"
        self.openai_base_url = openai_base_url or os.getenv("OPENAI_API_BASE")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.prompt_fn = prompt_fn or get_agent_system_prompt_crypto
        self.agent_meta = agent_meta or {}
        self.client = None
        self.tools = None
        self.model = None
        self.agent = None
        self.data_path = os.path.join(self.base_log_path, self.signature)
        self.position_file = os.path.join(self.data_path, "position", "position.jsonl")

    def _get_default_mcp_config(self) -> Dict[str, Dict[str, Any]]:
        return {
            "math": {"transport": "streamable_http", "url": f"http://localhost:{os.getenv('MATH_HTTP_PORT', '8000')}/mcp"},
            "search": {"transport": "streamable_http", "url": f"http://localhost:{os.getenv('SEARCH_HTTP_PORT', '8001')}/mcp"},
            "price": {"transport": "streamable_http", "url": f"http://localhost:{os.getenv('GETPRICE_HTTP_PORT', '8003')}/mcp"},
            "trade": {"transport": "streamable_http", "url": f"http://localhost:{os.getenv('CRYPTO_HTTP_PORT', '8005')}/mcp"},
        }

    async def initialize(self) -> None:
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY not set")
        self.client = MultiServerMCPClient(self.mcp_config)
        self.tools = await self.client.get_tools()
        if not self.tools:
            raise RuntimeError("No MCP tools loaded. Run: python agent_tools/start_mcp_services.py")
        print(f"Loaded {len(self.tools)} MCP tools")
        if "deepseek" in (self.basemodel or "").lower():
            self.model = DeepSeekChatOpenAI(
                model=self.basemodel, base_url=self.openai_base_url, api_key=self.openai_api_key,
                max_retries=3, timeout=30,
            )
        else:
            self.model = ChatOpenAI(
                model=self.basemodel, base_url=self.openai_base_url, api_key=self.openai_api_key,
                max_retries=3, timeout=30,
            )
        print(f"CryptoAgent {self.signature} initialized")

    def _setup_logging(self, today_date: str) -> str:
        log_path = os.path.join(self.base_log_path, self.signature, "log", today_date)
        os.makedirs(log_path, exist_ok=True)
        return os.path.join(log_path, "log.jsonl")

    def _log_message(self, log_file: str, new_messages: List[Dict]) -> None:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps({"signature": self.signature, "new_messages": new_messages}, ensure_ascii=False) + "\n")

    async def _ainvoke_with_retry(self, message: List[Dict]) -> Any:
        for attempt in range(1, self.max_retries + 1):
            try:
                return await self.agent.ainvoke({"messages": message}, {"recursion_limit": 100})
            except Exception as e:
                if attempt == self.max_retries:
                    raise
                await asyncio.sleep(self.base_delay * attempt)

    async def run_trading_session(self, today_date: str) -> None:
        log_file = self._setup_logging(today_date)
        write_config_value("LOG_FILE", log_file)
        write_config_value("MARKET", "crypto")
        write_config_value("LOG_PATH", self.base_log_path)
        self.agent = create_agent(
            self.model,
            tools=self.tools,
            system_prompt=self.prompt_fn(today_date, self.signature, self.market, self.crypto_symbols),
        )
        user_query = [{"role": "user", "content": f"Please analyze and update today's ({today_date}) positions."}]
        message = user_query.copy()
        self._log_message(log_file, user_query)
        for step in range(1, self.max_steps + 1):
            try:
                response = await self._ainvoke_with_retry(message)
                agent_response = extract_conversation(response, "final")
                if STOP_SIGNAL in (agent_response or ""):
                    self._log_message(log_file, [{"role": "assistant", "content": agent_response}])
                    break
                tool_msgs = extract_tool_messages(response)
                tool_response = "\n".join([getattr(m, "content", "") for m in tool_msgs])
                new_messages = [
                    {"role": "assistant", "content": agent_response},
                    {"role": "user", "content": f"Tool results: {tool_response}"},
                ]
                message.extend(new_messages)
                self._log_message(log_file, new_messages[0])
                self._log_message(log_file, new_messages[1])
            except Exception as e:
                raise
        if get_config_value("IF_TRADE"):
            write_config_value("IF_TRADE", False)
        else:
            add_no_trade_record(today_date, self.signature)
            write_config_value("IF_TRADE", False)

    def register_agent(self) -> None:
        if os.path.exists(self.position_file):
            self._write_meta()
            return
        os.makedirs(os.path.dirname(self.position_file), exist_ok=True)
        init_position = {s: 0.0 for s in self.crypto_symbols}
        init_position["CASH"] = self.initial_cash
        with open(self.position_file, "w") as f:
            f.write(json.dumps({"date": self.init_date, "id": 0, "positions": init_position}) + "\n")
        self._write_meta()
        print(f"Registered agent {self.signature}")

    def _write_meta(self) -> None:
        """Write agent_meta.json with display name, model, strategy info."""
        meta_file = os.path.join(self.data_path, "agent_meta.json")
        meta = {
            "signature": self.signature,
            "display_name": self.agent_meta.get("display_name", self.signature),
            "basemodel": self.basemodel,
            "strategy_id": self.agent_meta.get("strategy_id", "default"),
            "strategy_description": self.agent_meta.get("strategy_description", ""),
        }
        os.makedirs(self.data_path, exist_ok=True)
        with open(meta_file, "w") as f:
            json.dump(meta, f, indent=2)

    def get_trading_dates(self, init_date: str, end_date: str) -> List[str]:
        from tools.price_tools import is_trading_day
        if not os.path.exists(self.position_file):
            self.register_agent()
            max_date = init_date
        else:
            max_date = None
            with open(self.position_file, "r") as f:
                for line in f:
                    if not line.strip():
                        continue
                    doc = json.loads(line)
                    d = doc.get("date")
                    if d and (max_date is None or (datetime.strptime(d, "%Y-%m-%d") > datetime.strptime(max_date, "%Y-%m-%d"))):
                        max_date = d
            if max_date is None:
                max_date = init_date
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        max_dt = datetime.strptime(max_date, "%Y-%m-%d")
        if end_dt <= max_dt:
            return []
        out = []
        cur = max_dt + timedelta(days=1)
        while cur <= end_dt:
            ds = cur.strftime("%Y-%m-%d")
            if is_trading_day(ds, market=self.market):
                out.append(ds)
            cur += timedelta(days=1)
        return out

    async def run_with_retry(self, today_date: str) -> None:
        for attempt in range(1, self.max_retries + 1):
            try:
                await self.run_trading_session(today_date)
                return
            except Exception as e:
                if attempt == self.max_retries:
                    raise
                await asyncio.sleep(self.base_delay * attempt)

    async def run_date_range(self, init_date: str, end_date: str) -> None:
        trading_dates = self.get_trading_dates(init_date, end_date)
        if not trading_dates:
            print("No trading days to process")
            return
        for date in trading_dates:
            write_config_value("TODAY_DATE", date)
            write_config_value("SIGNATURE", self.signature)
            await self.run_with_retry(date)
        print(f"Completed {self.signature}")

    def get_position_summary(self) -> Dict[str, Any]:
        if not os.path.exists(self.position_file):
            return {"error": "No position file"}
        positions = []
        with open(self.position_file, "r") as f:
            for line in f:
                if line.strip():
                    positions.append(json.loads(line))
        if not positions:
            return {"error": "No records"}
        last = positions[-1]
        return {"signature": self.signature, "latest_date": last.get("date"), "positions": last.get("positions", {}), "total_records": len(positions)}
