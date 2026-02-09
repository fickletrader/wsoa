"""Alpha Vantage news search for WSOA (crypto/market news)."""
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastmcp import FastMCP

project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))
load_dotenv()

from tools.general_tools import get_config_value

logger = logging.getLogger(__name__)


class AlphaVantageNewsTool:
    def __init__(self):
        self.api_key = os.environ.get("ALPHAADVANTAGE_API_KEY")
        if not self.api_key:
            raise ValueError("Set ALPHAADVANTAGE_API_KEY")
        self.base_url = "https://www.alphavantage.co/query"

    def _fetch_news(
        self,
        tickers: Optional[str] = None,
        topics: Optional[str] = None,
        time_from: Optional[str] = None,
        time_to: Optional[str] = None,
        sort: str = "LATEST",
    ) -> List[Dict[str, Any]]:
        params = {
            "function": "NEWS_SENTIMENT",
            "apikey": self.api_key,
            "sort": sort,
            "limit": 20,
        }
        if tickers:
            params["tickers"] = tickers
        if topics:
            params["topics"] = topics
        if time_from:
            params["time_from"] = time_from
        if time_to:
            params["time_to"] = time_to
        response = requests.get(self.base_url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if "Error Message" in data:
            raise Exception(data["Error Message"])
        if "Note" in data:
            raise Exception(data["Note"])
        feed = data.get("feed", [])
        return feed[: params["limit"]]

    def __call__(
        self,
        query: str,
        tickers: Optional[str] = None,
        topics: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        today_date = get_config_value("TODAY_DATE")
        time_from = time_to = None
        if today_date:
            try:
                if " " in today_date:
                    dt = datetime.strptime(today_date, "%Y-%m-%d %H:%M:%S")
                else:
                    dt = datetime.strptime(today_date, "%Y-%m-%d")
                time_to = dt.strftime("%Y%m%dT%H%M")
                time_from = (dt - timedelta(days=30)).strftime("%Y%m%dT%H%M")
            except Exception:
                pass
        return self._fetch_news(tickers=tickers, topics=topics, time_from=time_from, time_to=time_to, sort="LATEST")


mcp = FastMCP("Search")


@mcp.tool()
def get_market_news(
    query: str,
    tickers: Optional[str] = None,
    topics: Optional[str] = None,
) -> str:
    """Retrieve market/crypto news (Alpha Vantage). Only articles before TODAY_DATE. tickers e.g. CRYPTO:BTC,CRYPTO:ETH. topics e.g. blockchain,financial_markets."""
    try:
        tool = AlphaVantageNewsTool()
        results = tool(query=query, tickers=tickers, topics=topics)
        if not results:
            return f"No news found for '{query}' (tickers={tickers}, topics={topics})."
        out = []
        for a in results:
            out.append(f"Title: {a.get('title', 'N/A')}\nSummary: {(a.get('summary') or '')[:1000]}\n--------------------------------")
        return "\n".join(out)
    except Exception as e:
        logger.exception("News tool failed")
        return f"News tool failed: {e}"


if __name__ == "__main__":
    port = int(os.getenv("SEARCH_HTTP_PORT", "8001"))
    mcp.run(transport="streamable-http", port=port)
