#!/usr/bin/env python3
"""Start WSOA MCP services: Math, Search, LocalPrices, CryptoTradeTools."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class MCPServiceManager:
    def __init__(self):
        self.services = {}
        self.running = True
        self.ports = {
            "math": int(os.getenv("MATH_HTTP_PORT", "8000")),
            "search": int(os.getenv("SEARCH_HTTP_PORT", "8001")),
            "price": int(os.getenv("GETPRICE_HTTP_PORT", "8003")),
            "crypto": int(os.getenv("CRYPTO_HTTP_PORT", "8005")),
        }
        mcp_dir = Path(__file__).resolve().parent
        self.service_configs = {
            "math": {"script": str(mcp_dir / "tool_math.py"), "name": "Math", "port": self.ports["math"]},
            "search": {"script": str(mcp_dir / "tool_alphavantage_news.py"), "name": "Search", "port": self.ports["search"]},
            "price": {"script": str(mcp_dir / "tool_get_price_local.py"), "name": "LocalPrices", "port": self.ports["price"]},
            "crypto": {"script": str(mcp_dir / "tool_crypto_trade.py"), "name": "CryptoTradeTools", "port": self.ports["crypto"]},
        }
        self.log_dir = PROJECT_ROOT / "logs"
        self.log_dir.mkdir(exist_ok=True)
        signal.signal(signal.SIGINT, self._handler)
        signal.signal(signal.SIGTERM, self._handler)

    def _handler(self, signum, frame):
        print("\nStopping all MCP services...")
        self._stop_all()
        sys.exit(0)

    def _port_available(self, port):
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            r = s.connect_ex(("localhost", port))
            s.close()
            return r != 0
        except Exception:
            return False

    def _start_one(self, sid, config):
        script, name, port = config["script"], config["name"], config["port"]
        if not Path(script).exists():
            print(f"Script not found: {script}")
            return False
        log_file = self.log_dir / f"{sid}.log"
        try:
            proc = subprocess.Popen(
                [sys.executable, script],
                stdout=log_file.open("w"),
                stderr=subprocess.STDOUT,
                cwd=str(PROJECT_ROOT),
            )
            self.services[sid] = {"process": proc, "name": name, "port": port, "log_file": log_file}
            print(f"Started {name} (PID {proc.pid}, port {port})")
            return True
        except Exception as e:
            print(f"Failed to start {name}: {e}")
            return False

    def _stop_all(self):
        for sid, svc in self.services.items():
            try:
                svc["process"].terminate()
                svc["process"].wait(timeout=5)
            except subprocess.TimeoutExpired:
                svc["process"].kill()
            except Exception:
                pass
        print("All MCP services stopped.")

    def start_all(self):
        print("Starting WSOA MCP services...")
        for sid, config in self.service_configs.items():
            if not self._port_available(config["port"]):
                print(f"Port {config['port']} in use for {config['name']}; start anyway (may conflict).")
            self._start_one(sid, config)
        print("Waiting for services to bind...")
        time.sleep(3)
        healthy = sum(1 for sid in self.services if self.services[sid]["process"].poll() is None)
        print(f"{healthy}/{len(self.services)} services running. Logs: {self.log_dir}")
        try:
            while self.running:
                time.sleep(5)
        except KeyboardInterrupt:
            pass
        finally:
            self._stop_all()


if __name__ == "__main__":
    manager = MCPServiceManager()
    manager.start_all()
