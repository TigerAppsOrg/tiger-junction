"""Request-shaping tests for OpenAiLlmClient against a mock OpenRouter."""

from __future__ import annotations

import json

import httpx
import pytest

from app.config import Settings
from app.llm_client import OpenAiLlmClient

_SSE_BODY = 'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'


def _make_client(captured: list[dict]) -> OpenAiLlmClient:
    settings = Settings(openrouter_api_key="test-key")
    client = OpenAiLlmClient(settings)

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(json.loads(request.content))
        return httpx.Response(
            200, text=_SSE_BODY, headers={"content-type": "text/event-stream"}
        )

    # Swap the internal transport for a mock; base_url must survive.
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url=settings.openrouter_base_url,
    )
    return client


async def _drain(client: OpenAiLlmClient, **kwargs) -> None:
    async for _ in client.stream_chat(messages=[{"role": "user", "content": "x"}], **kwargs):
        pass
    await client.close()


@pytest.mark.asyncio
async def test_stream_chat_passes_session_id() -> None:
    captured: list[dict] = []
    client = _make_client(captured)
    await _drain(client, session_id="conv-123")
    assert captured[0]["session_id"] == "conv-123"


@pytest.mark.asyncio
async def test_stream_chat_truncates_session_id_to_openrouter_limit() -> None:
    captured: list[dict] = []
    client = _make_client(captured)
    await _drain(client, session_id="x" * 300)
    assert len(captured[0]["session_id"]) == 256


@pytest.mark.asyncio
async def test_stream_chat_omits_session_id_when_absent() -> None:
    captured: list[dict] = []
    client = _make_client(captured)
    await _drain(client)
    assert "session_id" not in captured[0]


@pytest.mark.asyncio
async def test_stream_chat_adds_cache_control_for_anthropic_models() -> None:
    captured: list[dict] = []
    client = _make_client(captured)
    await _drain(client, model="anthropic/claude-sonnet-4-6")
    assert captured[0]["cache_control"] == {"type": "ephemeral"}


@pytest.mark.asyncio
async def test_stream_chat_no_cache_control_for_other_models() -> None:
    captured: list[dict] = []
    client = _make_client(captured)
    await _drain(client, model="moonshotai/kimi-k2:thinking")
    assert "cache_control" not in captured[0]
