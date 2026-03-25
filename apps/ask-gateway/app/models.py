from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class AskStreamRequest(BaseModel):
    conversationId: str | None = None
    term: int | None = None
    messages: list[ChatMessage] = Field(min_length=1)


class ToolCall(BaseModel):
    name: str
    arguments: dict[str, Any]
