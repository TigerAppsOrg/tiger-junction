from __future__ import annotations

import asyncio
import json

import pytest

from app.chat_service import ChatService
from app.config import Settings
from app.models import AskStreamRequest, ChatMessage


def _parse_events(chunks: list[str]) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    for chunk in chunks:
        lines = [line for line in chunk.splitlines() if line]
        if len(lines) < 2:
            continue
        event = lines[0].replace("event: ", "", 1)
        data = json.loads(lines[1].replace("data: ", "", 1))
        events.append((event, data))
    return events


@pytest.mark.asyncio
async def test_stream_emits_done(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            return {"content": [{"type": "text", "text": "ok"}], "tool": name}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(Settings(tool_timeout_seconds=1, connect_timeout_seconds=1))
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="find departments")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    names = [name for name, _ in events]

    assert "tool_call" in names
    assert "tool_result" in names
    assert "done" in names


@pytest.mark.asyncio
async def test_stream_emits_timeout_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class SlowMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            await asyncio.sleep(0.02)
            return "sid"

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", SlowMcpClient)
    service = ChatService(Settings(tool_timeout_seconds=0.001, connect_timeout_seconds=1))
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="hello")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    error_events = [data for name, data in events if name == "error"]

    assert error_events
    assert error_events[-1]["code"] == "timeout"


@pytest.mark.asyncio
async def test_stream_handles_disconnect(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(Settings(tool_timeout_seconds=1, connect_timeout_seconds=1))
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="hello")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: True)]
    events = _parse_events(chunks)
    error_events = [data for name, data in events if name == "error"]

    assert error_events
    assert error_events[-1]["code"] == "cancelled"
