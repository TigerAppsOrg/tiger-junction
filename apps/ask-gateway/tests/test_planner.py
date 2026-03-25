from __future__ import annotations

import pytest

from app.chat_service import _plan_tools_with_llm
from app.models import PlannerDecision


class FakeLlmClient:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        return self._payload


@pytest.mark.asyncio
async def test_llm_planner_accepts_valid_payload() -> None:
    llm = FakeLlmClient(
        {
            "intent": "course_details",
            "tool_calls": [
                {"name": "get_course_details", "arguments": {"code": "COS 126"}},
                {"name": "get_course_evaluations", "arguments": {"code": "COS 126"}},
            ],
            "needs_clarification": False,
            "clarification_question": None,
            "confidence": 0.9,
        }
    )
    decision = await _plan_tools_with_llm(
        prompt="tell me about cos 126 evaluations",
        term=1264,
        llm_client=llm,  # type: ignore[arg-type]
    )

    assert isinstance(decision, PlannerDecision)
    assert decision is not None
    assert len(decision.tool_calls) == 2
    assert decision.tool_calls[0].name == "get_course_details"


@pytest.mark.asyncio
async def test_llm_planner_rejects_unknown_tool() -> None:
    llm = FakeLlmClient(
        {
            "intent": "weird",
            "tool_calls": [{"name": "delete_everything", "arguments": {}}],
            "needs_clarification": False,
            "clarification_question": None,
            "confidence": 0.2,
        }
    )
    decision = await _plan_tools_with_llm(
        prompt="do something",
        term=None,
        llm_client=llm,  # type: ignore[arg-type]
    )

    assert decision is None
