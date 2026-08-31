# -*- coding: utf-8 -*-
"""一个轻量 MCP stdio server，提供当前时间和实时天气工具。"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

PROTOCOL_VERSION = "2024-11-05"


def _read_message() -> dict[str, Any] | None:
    headers: dict[str, str] = {}
    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            return None
        if line in (b"\r\n", b"\n"):
            break
        key, _, value = line.decode("utf-8").partition(":")
        headers[key.lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    if length <= 0:
        return None
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def _write_message(payload: dict[str, Any]) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(f"Content-Length: {len(data)}\r\n\r\n".encode("ascii") + data)
    sys.stdout.buffer.flush()


def _timezone_name() -> str:
    return os.getenv("APP_TIMEZONE") or os.getenv("TZ") or "Asia/Shanghai"


def get_current_time() -> str:
    tz_name = _timezone_name()
    try:
        now = datetime.now(ZoneInfo(tz_name))
    except Exception:
        tz_name = "Asia/Shanghai"
        now = datetime.now(ZoneInfo(tz_name))
    weekday = "一二三四五六日"[now.weekday()]
    return (
        f"当前日期：{now.year}年{now.month}月{now.day}日，星期{weekday}；"
        f"当前时间：{now.strftime('%H:%M')}；时区：{tz_name}。"
    )


_CITY_STOP_WORDS = (
    "今天", "今日", "现在", "目前", "明天", "昨天", "这边", "这里", "那边", "当地",
    "的", "怎么样", "如何", "咋样", "好吗", "好不好", "怎样", "多少", "几度", "会不会",
)


def extract_weather_location(text: str, default_location: str) -> str:
    patterns = [
        r"(?:今天|今日|现在|目前|明天)?\s*([^，。？！?\s]{2,20}?)(?:的)?天气",
        r"([^，。？！?\s]{2,20}?)(?:冷不冷|热不热|会下雨|下雨吗|气温|温度|几度)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        candidate = match.group(1).strip()
        for stop in _CITY_STOP_WORDS:
            candidate = candidate.replace(stop, "")
        if 1 < len(candidate) <= 20:
            return candidate
    return default_location


def _http_json(url: str) -> dict[str, Any]:
    req = Request(url, headers={"User-Agent": "CubismWebSamples-MCP/1.0"})
    with urlopen(req, timeout=6) as resp:
        return json.loads(resp.read().decode("utf-8"))


_WEATHER_CODE_ZH = {
    0: "晴", 1: "大部晴朗", 2: "局部多云", 3: "阴",
    45: "有雾", 48: "雾凇", 51: "小毛毛雨", 53: "毛毛雨", 55: "较强毛毛雨",
    61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "强冻雨",
    71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
    80: "短时小雨", 81: "短时阵雨", 82: "强阵雨",
    85: "小阵雪", 86: "强阵雪", 95: "雷雨", 96: "雷雨伴小冰雹", 99: "雷雨伴冰雹",
}


def get_weather_from_text(text: str, default_location: str = "上海") -> str:
    location = extract_weather_location(text, default_location)
    geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urlencode({
        "name": location,
        "count": 1,
        "language": "zh",
        "format": "json",
    })
    geo = _http_json(geo_url)
    results = geo.get("results") or []
    if not results:
        return f"未查到“{location}”的天气位置。"

    place = results[0]
    forecast_url = "https://api.open-meteo.com/v1/forecast?" + urlencode({
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        "timezone": "auto",
    })
    data = _http_json(forecast_url)
    current = data.get("current") or {}
    units = data.get("current_units") or {}
    place_name = place.get("name") or location
    admin = place.get("admin1") or place.get("country") or ""
    weather = _WEATHER_CODE_ZH.get(current.get("weather_code"), "天气状况未知")
    default_note = "（用户未指定城市，使用默认城市）" if location == default_location and default_location not in text else ""
    return (
        f"{place_name}{('，' + admin) if admin and admin != place_name else ''}实时天气{default_note}：{weather}，"
        f"气温{current.get('temperature_2m')} {units.get('temperature_2m', '°C')}，"
        f"体感{current.get('apparent_temperature')} {units.get('apparent_temperature', '°C')}，"
        f"湿度{current.get('relative_humidity_2m')}%，"
        f"降水{current.get('precipitation')} {units.get('precipitation', 'mm')}，"
        f"风速{current.get('wind_speed_10m')} {units.get('wind_speed_10m', 'km/h')}。"
    )


TOOLS = [
    {
        "name": "get_current_time",
        "description": "获取当前日期、时间、星期和时区。",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_weather_from_text",
        "description": "从用户中文天气问题中识别城市，并查询实时天气；未识别城市时使用默认城市。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "default_location": {"type": "string", "default": "上海"},
            },
            "required": ["text"],
        },
    },
]


def _tool_result(text: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": text}]}


def handle_request(message: dict[str, Any]) -> dict[str, Any] | None:
    method = message.get("method")
    msg_id = message.get("id")
    try:
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "cubism-realtime", "version": "1.0.0"},
                },
            }
        if method == "notifications/initialized":
            return None
        if method == "tools/list":
            return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
        if method == "tools/call":
            params = message.get("params") or {}
            name = params.get("name")
            args = params.get("arguments") or {}
            if name == "get_current_time":
                result = _tool_result(get_current_time())
            elif name == "get_weather_from_text":
                result = _tool_result(get_weather_from_text(
                    str(args.get("text", "")),
                    str(args.get("default_location") or "上海"),
                ))
            else:
                raise ValueError(f"未知工具: {name}")
            return {"jsonrpc": "2.0", "id": msg_id, "result": result}
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        }
    except Exception as error:
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32000, "message": str(error)},
        }


def main() -> None:
    while True:
        message = _read_message()
        if message is None:
            break
        response = handle_request(message)
        if response is not None:
            _write_message(response)


if __name__ == "__main__":
    main()
