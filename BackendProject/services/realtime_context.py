# -*- coding: utf-8 -*-
"""实时上下文：只负责按需调用 MCP 工具，不在业务层直接查天气。"""
from __future__ import annotations

import os

from services.mcp_client import realtime_mcp_client

_WEATHER_WORDS = (
    "天气", "气温", "温度", "冷不冷", "热不热",
    "下雨", "下雪", "刮风", "空气", "几度",
)


def wants_weather(text: str) -> bool:
    return any(word in text for word in _WEATHER_WORDS)


async def build_realtime_context(text: str) -> str:
    parts: list[str] = []

    try:
        parts.append(await realtime_mcp_client.call_tool("get_current_time"))
    except Exception:
        parts.append("当前日期时间暂时获取失败。")

    if wants_weather(text):
        try:
            parts.append(await realtime_mcp_client.call_tool(
                "get_weather_from_text",
                {
                    "text": text,
                    "default_location": os.getenv("DEFAULT_WEATHER_LOCATION", "上海"),
                },
            ))
        except Exception:
            parts.append("天气查询暂时失败；如果用户问天气，请温柔说明现在查不到实时天气，可以稍后重试，或让用户指定城市再试。")

    return "\n".join(part for part in parts if part)
