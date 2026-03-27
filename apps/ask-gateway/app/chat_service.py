from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from typing import Any, AsyncIterator, Callable

logger = logging.getLogger("ask-gateway.chat")

from .config import Settings
from .llm_client import LlmClientError, OpenAiLlmClient
from .mcp_client import McpClientError, McpHttpClient
from .models import AskStreamRequest, ToolCall
from .response_synthesizer import synthesize_final_response
from .usage_tracker import (
    resolve_model_for_user_async,
    record_usage_async,
    get_user_usage_async,
)
from . import supabase_store

MAX_TOOL_ITERATIONS = 20

_SYSTEM_PROMPT = """\
You are an AI course assistant for Princeton University students. You help students \
find courses, understand workload, compare options, and make informed decisions.

The upcoming term is Fall 2026 (term code 1272). Unless the user specifies otherwise, \
default to searching and discussing courses for Fall 2026. The current term is Spring 2026 (1264).

Guidelines:
- Always use tools to look up real data. Do not fabricate course information.
- After receiving tool results, synthesize a helpful, conversational response.
- When comparing courses, highlight key differences (rating, workload, schedule).
- Keep responses concise but thorough. Use bullet points and bold for readability.
- When searching for courses, prefer term 1272 (Fall 2026) unless the user asks about a different term.
"""

_SCHEDULE_PROMPT_ADDENDUM = """

You also have access to the user's TigerJunction (junction.tigerapps.org) schedule.
- Get their schedules with get_user_schedules (no userId needed — you are already authenticated)
When the user asks about "my schedule", "my courses", or wants to add/remove/manage courses, use tools.
When the user wants to find courses that fit their schedule, use search_courses with the scheduleId parameter — this combines all search filters (department, text, days, time, instructor, distribution) with schedule conflict checking.
"""


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _plan_tools(prompt: str, term: int | None) -> list[ToolCall]:
    lowered = prompt.lower()
    detected_codes = _extract_course_codes(prompt)
    asks_course_feedback = any(
        keyword in lowered
        for keyword in (
            "evaluation",
            "evaluations",
            "review",
            "reviews",
            "rating",
            "ratings",
            "workload",
        )
    )

    if detected_codes:
        args: dict[str, object] = {"code": detected_codes[0]}
        if term is not None:
            args["term"] = term
        if asks_course_feedback:
            return [
                ToolCall(name="get_course_details", arguments=args),
                ToolCall(name="get_course_evaluations", arguments=args),
            ]
        return [ToolCall(name="get_course_details", arguments=args)]

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


def _extract_course_codes(prompt: str) -> list[str]:
    matches = re.findall(r"\b([A-Za-z]{3})\s*[-/]?\s*(\d{3})\b", prompt)
    normalized: list[str] = []
    seen: set[str] = set()
    for department, number in matches:
        code = f"{department.upper()} {number}"
        if code in seen:
            continue
        seen.add(code)
        normalized.append(code)
    return normalized


class ChatService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def stream_chat(
        self,
        payload: AskStreamRequest,
        is_disconnected: Callable[[], bool],
        request_id: str | None = None,
    ) -> AsyncIterator[str]:
        if not self._settings.ask_llm_planner_enabled:
            async for event in self._stream_deterministic(
                payload, is_disconnected, request_id
            ):
                yield event
            return

        async for event in self._stream_agentic(payload, is_disconnected, request_id):
            yield event

    async def _stream_agentic(
        self,
        payload: AskStreamRequest,
        is_disconnected: Callable[[], bool],
        request_id: str | None,
    ) -> AsyncIterator[str]:
        request_id = request_id or str(uuid.uuid4())
        conversation_id = payload.conversationId or str(uuid.uuid4())
        prompt = payload.messages[-1].content
        mcp_url = self._settings.junction_mcp_url if payload.netid else None
        mcp_client = McpHttpClient(self._settings, netid=payload.netid, mcp_url=mcp_url)
        llm_client = OpenAiLlmClient(self._settings)
        session_id: str | None = None

        # Quota enforcement
        quota_before: dict | None = None
        effective_model: str | None = payload.model
        if payload.netid:
            quota_before = await resolve_model_for_user_async(payload.netid)
            if quota_before["blocked"]:
                yield sse_event(
                    "quota_exhausted",
                    {
                        "percentUsed": 100,
                        "resetSeconds": quota_before["resetSeconds"],
                        "requestId": request_id,
                    },
                )
                return
            effective_model = quota_before["model"]

        try:
            yield sse_event("status", {"phase": "starting", "requestId": request_id})

            system_prompt = _SYSTEM_PROMPT
            if payload.netid:
                system_prompt += _SCHEDULE_PROMPT_ADDENDUM

            messages: list[dict[str, Any]] = [
                {"role": "system", "content": system_prompt},
                *[m.model_dump() for m in payload.messages],
            ]

            # Fetch tools dynamically from MCP server (cached with 60s TTL)
            llm_tools = await asyncio.wait_for(
                mcp_client.list_tools(), timeout=self._settings.tool_timeout_seconds
            )
            # list_tools initializes the session, so capture it
            session_id = mcp_client._session_id
            collected_usage: dict[str, Any] | None = None
            # Accumulate usage across all LLM iterations (tool-calling loop)
            total_cost = 0.0
            total_input_tokens = 0
            total_output_tokens = 0
            # Track tool calls for persistence
            persisted_tool_events: list[dict[str, Any]] = []

            for iteration in range(MAX_TOOL_ITERATIONS):
                if is_disconnected():
                    raise asyncio.CancelledError()

                collected_content = ""
                collected_reasoning = ""
                collected_tool_calls: list[dict[str, Any]] = []
                finish_reason: str | None = None

                async for chunk in llm_client.stream_chat(
                    messages=messages, tools=llm_tools, model=effective_model
                ):
                    if chunk.get("type") == "done":
                        break

                    if chunk.get("usage"):
                        collected_usage = chunk["usage"]
                        total_cost += collected_usage.get("cost") or 0
                        total_input_tokens += collected_usage.get("prompt_tokens") or 0
                        total_output_tokens += (
                            collected_usage.get("completion_tokens") or 0
                        )

                    choices = chunk.get("choices", [])
                    if not choices:
                        continue

                    delta = choices[0].get("delta", {})
                    if choices[0].get("finish_reason") is not None:
                        finish_reason = choices[0]["finish_reason"]

                    reasoning_text = _extract_reasoning(delta)
                    if reasoning_text:
                        collected_reasoning += reasoning_text
                        yield sse_event("thinking", {"content": reasoning_text})

                    token_content = delta.get("content")
                    if isinstance(token_content, str) and token_content:
                        collected_content += token_content
                        yield sse_event("token", {"text": token_content})

                    if delta.get("tool_calls"):
                        for tc_delta in delta["tool_calls"]:
                            idx = tc_delta.get("index", 0)
                            while len(collected_tool_calls) <= idx:
                                collected_tool_calls.append(
                                    {
                                        "id": "",
                                        "function": {"name": "", "arguments": ""},
                                    }
                                )
                            tc = collected_tool_calls[idx]
                            if "id" in tc_delta:
                                tc["id"] = tc_delta["id"]
                            if "function" in tc_delta:
                                fn = tc_delta["function"]
                                if "name" in fn:
                                    tc["function"]["name"] += fn["name"]
                                if "arguments" in fn:
                                    tc["function"]["arguments"] += fn["arguments"]

                # If no tool calls were made, we're done (regardless of finish_reason,
                # since some models like Gemini use "stop" even with tool calls).
                if not collected_tool_calls:
                    usage = {
                        "inputTokens": total_input_tokens,
                        "outputTokens": total_output_tokens,
                    }

                    # Record cost and get updated quota
                    quota_after: dict | None = None
                    if payload.netid:
                        if total_cost > 0:
                            await record_usage_async(payload.netid, total_cost)
                        quota_after = await get_user_usage_async(payload.netid)

                        # Save conversation to Supabase
                        conv_title = (
                            payload.messages[0].content[:80]
                            if payload.messages
                            else "New chat"
                        )
                        await supabase_store.save_message(
                            conversation_id, payload.netid, conv_title, "user", prompt
                        )
                        # Save tool calls/results
                        for te in persisted_tool_events:
                            await supabase_store.save_message(
                                conversation_id,
                                payload.netid,
                                conv_title,
                                te["type"],
                                json.dumps(te, default=str),
                            )
                        await supabase_store.save_message(
                            conversation_id,
                            payload.netid,
                            conv_title,
                            "assistant",
                            collected_content,
                            cost=total_cost if total_cost > 0 else None,
                            input_tokens=total_input_tokens or None,
                            output_tokens=total_output_tokens or None,
                            model=effective_model,
                        )

                    yield sse_event(
                        "status",
                        {
                            "phase": "done",
                            "requestId": request_id,
                            **({"sessionId": session_id} if session_id else {}),
                        },
                    )

                    done_data: dict[str, Any] = {
                        "conversationId": conversation_id,
                        "requestId": request_id,
                        **({"sessionId": session_id} if session_id else {}),
                        "usage": usage,
                    }
                    if quota_after is not None:
                        done_data["quota"] = {
                            "percentUsed": quota_after["percentUsed"],
                            "tier": quota_after["tier"],
                            "tierChanged": quota_before is not None
                            and quota_before["tier"] != quota_after["tier"],
                            "resetSeconds": quota_after["resetSeconds"],
                        }
                    yield sse_event("done", done_data)
                    return

                yield sse_event(
                    "status",
                    {
                        "phase": "calling_tool",
                        "requestId": request_id,
                        "sessionId": session_id,
                    },
                )
                # Append assistant message with tool_calls FIRST (before tool results)
                messages.append(
                    {
                        "role": "assistant",
                        "content": collected_content or None,
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": "function",
                                "function": tc["function"],
                            }
                            for tc in collected_tool_calls
                        ],
                    }
                )

                # Execute tools and append results
                for tc in collected_tool_calls:
                    tool_name = tc["function"]["name"]
                    try:
                        tool_args = json.loads(tc["function"]["arguments"] or "{}")
                    except json.JSONDecodeError:
                        tool_args = {}
                    tool_args = _sanitize_tool_args(tool_args)

                    yield sse_event(
                        "tool_call",
                        {
                            "name": tool_name,
                            "arguments": tool_args,
                            "call_id": tc["id"],
                            "requestId": request_id,
                            "sessionId": session_id,
                        },
                    )
                    persisted_tool_events.append(
                        {
                            "type": "tool_call",
                            "name": tool_name,
                            "arguments": tool_args,
                        }
                    )
                    result = await asyncio.wait_for(
                        mcp_client.call_tool(tool_name, tool_args),
                        timeout=self._settings.tool_timeout_seconds,
                    )
                    persisted_tool_events.append(
                        {
                            "type": "tool_result",
                            "name": tool_name,
                            "ok": True,
                            "result": result,
                        }
                    )
                    yield sse_event(
                        "tool_result",
                        {
                            "name": tool_name,
                            "call_id": tc["id"],
                            "ok": True,
                            "result": result,
                            "requestId": request_id,
                            "sessionId": session_id,
                        },
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": json.dumps(result),
                        }
                    )

            yield sse_event(
                "error",
                {
                    "code": "upstream_error",
                    "message": "Max tool call iterations reached.",
                    "requestId": request_id,
                },
            )
        except asyncio.CancelledError:
            yield sse_event(
                "error",
                {
                    "code": "cancelled",
                    "message": "Client disconnected; stream cancelled.",
                    "requestId": request_id,
                },
            )
        except asyncio.TimeoutError:
            yield sse_event(
                "error",
                {
                    "code": "timeout",
                    "message": "A downstream dependency timed out.",
                    "requestId": request_id,
                },
            )
        except McpClientError as exc:
            yield sse_event(
                "error",
                {
                    "code": "upstream_error",
                    "message": str(exc),
                    "requestId": request_id,
                },
            )
        except LlmClientError as exc:
            logger.exception("LLM client error for request %s: %s", request_id, exc)
            yield sse_event(
                "error",
                {
                    "code": "upstream_error",
                    "message": f"LLM error: {exc}",
                    "requestId": request_id,
                },
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.exception("Unexpected error for request %s: %s", request_id, exc)
            yield sse_event(
                "error",
                {"code": "unknown_error", "message": str(exc), "requestId": request_id},
            )
        finally:
            await mcp_client.close()
            await llm_client.close()

    async def _stream_deterministic(
        self,
        payload: AskStreamRequest,
        is_disconnected: Callable[[], bool],
        request_id: str | None,
    ) -> AsyncIterator[str]:
        request_id = request_id or str(uuid.uuid4())
        conversation_id = payload.conversationId or str(uuid.uuid4())
        prompt = payload.messages[-1].content
        mcp_url = self._settings.junction_mcp_url if payload.netid else None
        mcp_client = McpHttpClient(self._settings, netid=payload.netid, mcp_url=mcp_url)
        session_id: str | None = None

        # Quota enforcement (deterministic doesn't call LLM, but still check)
        if payload.netid:
            det_quota = await resolve_model_for_user_async(payload.netid)
            if det_quota["blocked"]:
                yield sse_event(
                    "quota_exhausted",
                    {
                        "percentUsed": 100,
                        "resetSeconds": det_quota["resetSeconds"],
                        "requestId": request_id,
                    },
                )
                return

        try:
            yield sse_event("status", {"phase": "starting", "requestId": request_id})
            tool_calls = _plan_tools(prompt, payload.term)
            if tool_calls:
                session_id = await asyncio.wait_for(
                    mcp_client.initialize(), timeout=self._settings.tool_timeout_seconds
                )
            executed_tool_runs: list[dict] = []
            for tool_call in tool_calls:
                if is_disconnected():
                    raise asyncio.CancelledError()
                yield sse_event(
                    "status",
                    {
                        "phase": "calling_tool",
                        "requestId": request_id,
                        "sessionId": session_id,
                    },
                )
                yield sse_event(
                    "tool_call",
                    {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments,
                        "requestId": request_id,
                        "sessionId": session_id,
                    },
                )
                result = await asyncio.wait_for(
                    mcp_client.call_tool(tool_call.name, tool_call.arguments),
                    timeout=self._settings.tool_timeout_seconds,
                )
                yield sse_event(
                    "tool_result",
                    {
                        "name": tool_call.name,
                        "ok": True,
                        "result": result,
                        "requestId": request_id,
                        "sessionId": session_id,
                    },
                )
                executed_tool_runs.append(
                    {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments,
                        "result": result,
                    }
                )

            yield sse_event(
                "status",
                {
                    "phase": "streaming",
                    "requestId": request_id,
                    **({"sessionId": session_id} if session_id else {}),
                },
            )
            response_text = await synthesize_final_response(
                prompt=prompt,
                tool_runs=executed_tool_runs,
                llm_client=None,
                llm_enabled=False,
            )
            for token in response_text.split(" "):
                if is_disconnected():
                    raise asyncio.CancelledError()
                yield sse_event("token", {"text": f"{token} "})
            yield sse_event(
                "status",
                {
                    "phase": "done",
                    "requestId": request_id,
                    **({"sessionId": session_id} if session_id else {}),
                },
            )
            det_done_data: dict[str, Any] = {
                "conversationId": conversation_id,
                "requestId": request_id,
                **({"sessionId": session_id} if session_id else {}),
                "usage": {
                    "inputTokens": 0,
                    "outputTokens": len(response_text.split()),
                },
            }
            if payload.netid:
                det_q = await get_user_usage_async(payload.netid)
                det_done_data["quota"] = {
                    "percentUsed": det_q["percentUsed"],
                    "tier": det_q["tier"],
                    "tierChanged": False,
                    "resetSeconds": det_q["resetSeconds"],
                }
            yield sse_event("done", det_done_data)
        except asyncio.CancelledError:
            yield sse_event(
                "error",
                {
                    "code": "cancelled",
                    "message": "Client disconnected; stream cancelled.",
                    "requestId": request_id,
                },
            )
        except asyncio.TimeoutError:
            yield sse_event(
                "error",
                {
                    "code": "timeout",
                    "message": "A downstream dependency timed out.",
                    "requestId": request_id,
                },
            )
        except McpClientError as exc:
            yield sse_event(
                "error",
                {
                    "code": "upstream_error",
                    "message": str(exc),
                    "requestId": request_id,
                },
            )
        finally:
            await mcp_client.close()


def _sanitize_tool_args(args: dict[str, Any]) -> dict[str, Any]:
    """Strip leading/trailing punctuation from string arguments.

    Some models (e.g. Kimi K2.5) prepend a period to arguments like
    ".ANT238" instead of "ANT238".
    """
    cleaned: dict[str, Any] = {}
    for key, value in args.items():
        if isinstance(value, str):
            cleaned[key] = value.strip().lstrip(".,;:!?")
        else:
            cleaned[key] = value
    return cleaned


def _extract_reasoning(delta: dict[str, Any]) -> str:
    # Prefer reasoning_details (structured) over reasoning (flat string)
    # to avoid duplication when models send both with the same content.
    reasoning_details = delta.get("reasoning_details")
    if isinstance(reasoning_details, list):
        texts: list[str] = []
        for item in reasoning_details:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                texts.append(item["text"])
        if texts:
            return "".join(texts)
    reasoning = delta.get("reasoning")
    if isinstance(reasoning, str):
        return reasoning
    return ""
