# -*- coding: utf-8 -*-
"""最小 MCP stdio 客户端，用于调用本项目内置 MCP server。"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any


class StdioMCPClient:
    def __init__(self, server_script: Path):
        self.server_script = server_script
        self._next_id = 1
        self._process: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()
        self._initialized = False

    async def _ensure_process(self) -> None:
        if self._process and self._process.returncode is None:
            return
        env = os.environ.copy()
        self._process = await asyncio.create_subprocess_exec(
            sys.executable,
            str(self.server_script),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        self._initialized = False

    async def _send(self, payload: dict[str, Any]) -> None:
        assert self._process and self._process.stdin
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._process.stdin.write(f"Content-Length: {len(data)}\r\n\r\n".encode("ascii") + data)
        await self._process.stdin.drain()

    async def _read(self) -> dict[str, Any]:
        assert self._process and self._process.stdout
        headers: dict[str, str] = {}
        while True:
            line = await asyncio.wait_for(self._process.stdout.readline(), timeout=10)
            if not line:
                raise RuntimeError("MCP server 已退出")
            if line in (b"\r\n", b"\n"):
                break
            key, _, value = line.decode("utf-8").partition(":")
            headers[key.lower()] = value.strip()
        length = int(headers.get("content-length", "0"))
        body = await asyncio.wait_for(self._process.stdout.readexactly(length), timeout=10)
        return json.loads(body.decode("utf-8"))

    async def _request(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        request_id = self._next_id
        self._next_id += 1
        payload: dict[str, Any] = {"jsonrpc": "2.0", "id": request_id, "method": method}
        if params is not None:
            payload["params"] = params
        await self._send(payload)
        response = await self._read()
        if "error" in response:
            raise RuntimeError(response["error"].get("message", str(response["error"])))
        return response.get("result") or {}

    async def initialize(self) -> None:
        await self._ensure_process()
        if self._initialized:
            return
        await self._request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "cubism-backend", "version": "1.0.0"},
        })
        await self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        self._initialized = True

    async def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> str:
        async with self._lock:
            await self.initialize()
            result = await self._request("tools/call", {
                "name": name,
                "arguments": arguments or {},
            })
        contents = result.get("content") or []
        return "\n".join(
            item.get("text", "")
            for item in contents
            if isinstance(item, dict) and item.get("type") == "text"
        ).strip()


_server_path = Path(__file__).resolve().parents[1] / "mcp_servers" / "realtime_server.py"
realtime_mcp_client = StdioMCPClient(_server_path)
