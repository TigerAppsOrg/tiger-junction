from __future__ import annotations

import asyncio
import json
import uuid
from typing import AsyncIterator, Callable

from .config import Settings
from .mcp_client import McpClientError, McpHttpClient
from .models import AskStreamRequest, ToolCall


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _plan_tools(prompt: str, term: int | None) -> list[ToolCall]:
    lowered = prompt.lower()
    if "department" in lowered:
        return [ToolCall(name="list_departments", arguments={})]
    if "instructor" in lowered or "professor" in lowered:
        return [ToolCall(name="search_instructors", arguments={"name": prompt})]
    if "review" in lowered or "rating" in lowered:
        return [ToolCall(name="find_top_rated_courses", arguments={"limit": 10})]

    args: dict[str, object] = {"query": prompt, "limit": 20}
    if term is not None:
        args["term"] = term
    return [ToolCall(name="search_courses", arguments=args)]


class ChatService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def stream_chat(
        self, payload: AskStreamRequest, is_disconnected: Callable[[], bool]
    ) -> AsyncIterator[str]:
        conversation_id = payload.conversationId or str(uuid.uuid4())
        prompt = payload.messages[-1].content
        client = McpHttpClient(self._settings)

        try:
            yield sse_event("status", {"phase": "starting"})
            await asyncio.wait_for(client.initialize(), timeout=self._settings.tool_timeout_seconds)

            tool_calls = _plan_tools(prompt, payload.term)
            aggregate_summaries: list[str] = []

            for tool_call in tool_calls:
                if is_disconnected():
                    raise asyncio.CancelledError()

                yield sse_event("status", {"phase": "calling_tool"})
                yield sse_event(
                    "tool_call",
                    {"name": tool_call.name, "arguments": tool_call.arguments},
                )
                result = await asyncio.wait_for(
                    client.call_tool(tool_call.name, tool_call.arguments),
                    timeout=self._settings.tool_timeout_seconds,
                )
                yield sse_event(
                    "tool_result",
                    {"name": tool_call.name, "ok": True, "result": result},
                )
                aggregate_summaries.append(
                    f"Tool {tool_call.name} returned data for your request."
                )

            yield sse_event("status", {"phase": "streaming"})
            response_text = " ".join(aggregate_summaries) or "No tools were called."
            for token in response_text.split(" "):
                if is_disconnected():
                    raise asyncio.CancelledError()
                yield sse_event("token", {"text": f"{token} "})
                await asyncio.sleep(0.005)

            yield sse_event("status", {"phase": "done"})
            yield sse_event(
                "done",
                {
                    "conversationId": conversation_id,
                    "usage": {"inputTokens": 0, "outputTokens": len(response_text.split())},
                },
            )
        except asyncio.CancelledError:
            yield sse_event(
                "error",
                {
                    "code": "cancelled",
                    "message": "Client disconnected; stream cancelled.",
                },
            )
        except asyncio.TimeoutError:
            yield sse_event(
                "error",
                {"code": "timeout", "message": "A downstream dependency timed out."},
            )
        except McpClientError as exc:
            yield sse_event("error", {"code": "upstream_error", "message": str(exc)})
        except Exception as exc:  # pragma: no cover - defensive fallback
            yield sse_event("error", {"code": "unknown_error", "message": str(exc)})
        finally:
            await client.close()
