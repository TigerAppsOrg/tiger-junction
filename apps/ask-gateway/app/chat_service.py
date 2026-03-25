from __future__ import annotations

import asyncio
import json
import re
import uuid
from typing import AsyncIterator, Callable

from pydantic import ValidationError

from .config import Settings
from .llm_client import LlmClientError, OpenAiLlmClient
from .mcp_client import McpClientError, McpHttpClient
from .models import AskStreamRequest, PlannerDecision, ToolCall
from .planner_prompt import AVAILABLE_TOOLS, build_planner_system_prompt, build_planner_user_prompt
from .response_synthesizer import synthesize_final_response


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _plan_tools(prompt: str, term: int | None) -> list[ToolCall]:
    lowered = prompt.lower()
    detected_codes = _extract_course_codes(prompt)
    asks_course_feedback = any(
        keyword in lowered
        for keyword in ("evaluation", "evaluations", "review", "reviews", "rating", "ratings", "workload")
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
        request_id = request_id or str(uuid.uuid4())
        conversation_id = payload.conversationId or str(uuid.uuid4())
        prompt = payload.messages[-1].content
        mcp_client = McpHttpClient(self._settings)
        llm_client: OpenAiLlmClient | None = None
        if self._settings.ask_llm_planner_enabled or self._settings.ask_llm_synthesis_enabled:
            llm_client = OpenAiLlmClient(self._settings)
        session_id: str | None = None

        try:
            yield sse_event("status", {"phase": "starting", "requestId": request_id})
            planner_decision = await self._plan_with_fallback(
                prompt=prompt,
                term=payload.term,
                llm_client=llm_client,
            )
            if planner_decision.needs_clarification:
                clarification_text = (
                    planner_decision.clarification_question
                    or "Can you share a bit more detail so I can pick the right course tools?"
                )
                yield sse_event("status", {"phase": "streaming", "requestId": request_id})
                for token in clarification_text.split(" "):
                    if is_disconnected():
                        raise asyncio.CancelledError()
                    yield sse_event("token", {"text": f"{token} "})
                    await asyncio.sleep(0.005)
                yield sse_event("status", {"phase": "done", "requestId": request_id})
                yield sse_event(
                    "done",
                    {
                        "conversationId": conversation_id,
                        "requestId": request_id,
                        "usage": {"inputTokens": 0, "outputTokens": len(clarification_text.split())},
                    },
                )
                return

            tool_calls = planner_decision.tool_calls
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
                    {"phase": "calling_tool", "requestId": request_id, "sessionId": session_id},
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
                llm_client=llm_client,
                llm_enabled=self._settings.ask_llm_synthesis_enabled,
            )
            for token in response_text.split(" "):
                if is_disconnected():
                    raise asyncio.CancelledError()
                yield sse_event("token", {"text": f"{token} "})
                await asyncio.sleep(0.005)

            yield sse_event(
                "status",
                {
                    "phase": "done",
                    "requestId": request_id,
                    **({"sessionId": session_id} if session_id else {}),
                },
            )
            yield sse_event(
                "done",
                {
                    "conversationId": conversation_id,
                    "requestId": request_id,
                    **({"sessionId": session_id} if session_id else {}),
                    "usage": {"inputTokens": 0, "outputTokens": len(response_text.split())},
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
                {"code": "upstream_error", "message": str(exc), "requestId": request_id},
            )
        except LlmClientError:
            yield sse_event(
                "error",
                {
                    "code": "upstream_error",
                    "message": "The language model dependency failed.",
                    "requestId": request_id,
                },
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            yield sse_event(
                "error",
                {"code": "unknown_error", "message": str(exc), "requestId": request_id},
            )
        finally:
            await mcp_client.close()
            if llm_client:
                await llm_client.close()

    async def _plan_with_fallback(
        self,
        *,
        prompt: str,
        term: int | None,
        llm_client: OpenAiLlmClient | None,
    ) -> PlannerDecision:
        if self._settings.ask_llm_planner_enabled and llm_client is not None:
            planner_decision = await _plan_tools_with_llm(
                prompt=prompt,
                term=term,
                llm_client=llm_client,
            )
            if planner_decision is not None:
                return planner_decision

        return PlannerDecision(
            intent="deterministic_fallback",
            tool_calls=_plan_tools(prompt, term),
            needs_clarification=False,
            clarification_question=None,
        )


async def _plan_tools_with_llm(
    *,
    prompt: str,
    term: int | None,
    llm_client: OpenAiLlmClient,
) -> PlannerDecision | None:
    try:
        raw = await llm_client.complete_json(
            system_prompt=build_planner_system_prompt(),
            user_prompt=build_planner_user_prompt(prompt, term),
        )
    except LlmClientError:
        return None

    try:
        parsed = PlannerDecision.model_validate(raw)
    except ValidationError:
        return None

    if parsed.needs_clarification:
        return parsed

    if not parsed.tool_calls:
        return None

    allowed_tools = set(AVAILABLE_TOOLS)
    for tool_call in parsed.tool_calls:
        if tool_call.name not in allowed_tools:
            return None

    return parsed
