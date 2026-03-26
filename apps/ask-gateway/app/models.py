from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class AskStreamRequest(BaseModel):
    conversationId: str | None = None
    term: int | None = None
    model: str | None = None
    messages: list[ChatMessage] = Field(min_length=1)


class ToolCall(BaseModel):
    name: str
    arguments: dict[str, Any]


class PlannerDecision(BaseModel):
    intent: str = "course_search"
    tool_calls: list[ToolCall] = Field(default_factory=list)
    needs_clarification: bool = False
    clarification_question: str | None = None
    confidence: float | None = None
