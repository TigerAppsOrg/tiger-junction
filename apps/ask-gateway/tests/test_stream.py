from __future__ import annotations

import asyncio
import json

import pytest

from app.chat_service import ChatService
from app.config import Settings
from app.llm_client import LlmClientError
from app.mcp_client import McpClientError
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


def _collect_token_text(events: list[tuple[str, dict]]) -> str:
    return "".join(data["text"] for name, data in events if name == "token")


@pytest.mark.asyncio
async def test_stream_emits_done(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            payload = {
                "count": 2,
                "courses": [
                    {
                        "code": "COS 126",
                        "title": "Computer Science: An Interdisciplinary Approach",
                        "status": "open",
                        "term": 1264,
                        "hasFinal": False,
                        "rating": 4.6,
                    },
                    {
                        "code": "COS 217",
                        "title": "Introduction to Programming Systems",
                        "status": "closed",
                        "term": 1264,
                        "hasFinal": True,
                        "rating": 4.2,
                    },
                ],
            }
            return {"content": [{"type": "text", "text": json.dumps(payload)}], "tool": name}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy CS courses")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    names = [name for name, _ in events]

    assert "tool_call" in names
    assert "tool_result" in names
    assert "done" in names
    tool_result = next(data for name, data in events if name == "tool_result")
    assert tool_result["name"] == "search_courses"
    assert tool_result["ok"] is True
    token_text = _collect_token_text(events)
    assert "Direct answer:" in token_text
    assert "Top picks:" in token_text
    assert "Why:" in token_text
    assert "Tool search_courses returned data for your request." not in token_text


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
    service = ChatService(
        Settings(
            tool_timeout_seconds=0.001,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
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
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="hello")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: True)]
    events = _parse_events(chunks)
    error_events = [data for name, data in events if name == "error"]

    assert error_events
    assert error_events[-1]["code"] == "cancelled"


@pytest.mark.asyncio
async def test_stream_handles_empty_course_results(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            return {"content": [{"type": "text", "text": json.dumps({"count": 0, "courses": []})}]}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy CS courses")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    token_text = _collect_token_text(events)

    assert "Direct answer: I could not find strong course matches" in token_text
    assert "No reliable matches were returned." in token_text


@pytest.mark.asyncio
async def test_stream_handles_malformed_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            return {"content": [{"type": "text", "text": "{not-json"}]}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy CS courses")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    token_text = _collect_token_text(events)

    assert "Direct answer: I could not safely read the tool output" in token_text
    assert "No reliable recommendations are available yet." in token_text


@pytest.mark.asyncio
async def test_stream_emits_upstream_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            raise McpClientError("boom")

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FailingMcpClient)
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy CS courses")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    error_events = [data for name, data in events if name == "error"]

    assert error_events
    assert error_events[-1]["code"] == "upstream_error"


@pytest.mark.asyncio
async def test_stream_course_question_uses_details_and_evaluations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            if name == "get_course_details":
                payload = {
                    "courseId": "001234-1264",
                    "listingId": "001234",
                    "term": 1264,
                    "code": "COS 126",
                    "title": "Computer Science: An Interdisciplinary Approach",
                    "description": "Foundations of computer science.",
                    "hasFinal": True,
                    "gradingBasis": "grade",
                }
                return {"content": [{"type": "text", "text": json.dumps(payload)}]}
            if name == "get_course_evaluations":
                payload = {
                    "listingId": "001234",
                    "termCount": 2,
                    "evaluations": [
                        {"evalTerm": "1254", "rating": 4.5, "numComments": 20, "summary": "Workload is moderate."},
                        {"evalTerm": "1244", "rating": 4.4, "numComments": 18, "summary": "Challenging but fair."},
                    ],
                }
                return {"content": [{"type": "text", "text": json.dumps(payload)}]}
            return {"content": [{"type": "text", "text": json.dumps({})}]}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=False,
            ask_llm_synthesis_enabled=False,
        )
    )
    payload = AskStreamRequest(
        messages=[
            ChatMessage(
                role="user",
                content="Tell me about COS126 / EGR126 (Computer Science: An Interdisciplinary Approach). What is the workload like? How are the evaluations?",
            )
        ]
    )

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)

    tool_calls = [data["name"] for name, data in events if name == "tool_call"]
    assert "get_course_details" in tool_calls
    assert "get_course_evaluations" in tool_calls

    token_text = _collect_token_text(events)
    assert "COS 126" in token_text
    assert "evaluation" in token_text.lower()


@pytest.mark.asyncio
async def test_stream_llm_direct_answer_no_tool_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeLlmClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def stream_chat(self, *, messages: list[dict], tools: list[dict], model: str | None = None):
            yield {
                "choices": [
                    {
                        "delta": {"content": "Could you share which department you care about most?"},
                        "finish_reason": "stop",
                    }
                ]
            }
            yield {"usage": {"prompt_tokens": 12, "completion_tokens": 9}}
            yield {"type": "done"}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.OpenAiLlmClient", FakeLlmClient)

    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=True,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="best cs?")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    names = [name for name, _ in events]
    token_text = _collect_token_text(events)

    assert "tool_call" not in names
    assert "Could you share which department" in token_text


@pytest.mark.asyncio
async def test_stream_llm_tool_call_loop_executes_mcp(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMcpClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def initialize(self) -> str:
            return "sid"

        async def call_tool(self, name: str, arguments: dict) -> dict:
            return {"content": [{"type": "text", "text": json.dumps({"count": 1, "courses": [{"code": "COS 126", "title": "Computer Science"}]})}]}

        async def close(self) -> None:
            return None

    class FakeLlmClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def stream_chat(self, *, messages: list[dict], tools: list[dict], model: str | None = None):
            has_tool_message = any(m.get("role") == "tool" for m in messages)
            if not has_tool_message:
                yield {
                    "choices": [
                        {
                            "delta": {
                                "tool_calls": [
                                    {
                                        "index": 0,
                                        "id": "call_1",
                                        "function": {
                                            "name": "search_courses",
                                            "arguments": "{\"query\":\"easy cs\",\"limit\":5}",
                                        },
                                    }
                                ]
                            },
                            "finish_reason": "tool_calls",
                        }
                    ]
                }
                yield {"type": "done"}
                return

            yield {
                "choices": [
                    {
                        "delta": {"content": "I found relevant courses and summarized them."},
                        "finish_reason": "stop",
                    }
                ]
            }
            yield {"usage": {"prompt_tokens": 20, "completion_tokens": 10}}
            yield {"type": "done"}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.McpHttpClient", FakeMcpClient)
    monkeypatch.setattr("app.chat_service.OpenAiLlmClient", FakeLlmClient)

    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_synthesis_enabled=True,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy cs courses")])

    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)
    names = [name for name, _ in events]
    token_text = _collect_token_text(events)

    assert "tool_call" in names
    assert "tool_result" in names
    assert "summarized them" in token_text


@pytest.mark.asyncio
async def test_stream_llm_error_emits_upstream_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeLlmClient:
        def __init__(self, settings: Settings) -> None:
            self._settings = settings

        async def stream_chat(self, *, messages: list[dict], tools: list[dict], model: str | None = None):
            raise LlmClientError("upstream down")
            yield {"type": "done"}  # pragma: no cover

        async def close(self) -> None:
            return None

    monkeypatch.setattr("app.chat_service.OpenAiLlmClient", FakeLlmClient)

    service = ChatService(
        Settings(
            tool_timeout_seconds=1,
            connect_timeout_seconds=1,
            ask_llm_planner_enabled=True,
        )
    )
    payload = AskStreamRequest(messages=[ChatMessage(role="user", content="easy CS courses")])
    chunks = [chunk async for chunk in service.stream_chat(payload, is_disconnected=lambda: False)]
    events = _parse_events(chunks)

    error_events = [data for name, data in events if name == "error"]
    assert error_events
    assert error_events[-1]["code"] == "upstream_error"
