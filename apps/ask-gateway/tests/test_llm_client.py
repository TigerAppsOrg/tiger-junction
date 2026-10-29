"""Native Anthropic wire protocol, caching, and usage accounting."""

from __future__ import annotations
import copy
import json
import httpx
import pytest
from app.config import Settings
from app.llm_client import AnthropicLlmClient, LlmClientError, normalize_usage

MESSAGES = [
    {"role": "system", "content": "Stable instructions"},
    {"role": "user", "content": "Find courses"},
]
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_courses",
            "description": "Find courses",
            "parameters": {
                "type": "object",
                "properties": {"term": {"type": "integer"}},
            },
        },
    }
]
START = {
    "type": "message_start",
    "message": {
        "usage": {
            "input_tokens": 100,
            "cache_creation_input_tokens": 200,
            "cache_read_input_tokens": 1000,
            "output_tokens": 1,
        }
    },
}
STOP = {"type": "message_stop"}
EVENTS = [
    START,
    {
        "type": "content_block_delta",
        "index": 0,
        "delta": {"type": "text_delta", "text": "hi"},
    },
    {
        "type": "message_delta",
        "delta": {"stop_reason": "end_turn"},
        "usage": {"output_tokens": 10},
    },
    STOP,
]


async def make_client(captured, events=None, status=200, body=None):
    client = AnthropicLlmClient(Settings(anthropic_api_key="test-key"))
    await client._client.aclose()

    def handler(request):
        captured.append(request)
        text = (
            body
            if body is not None
            else "".join(
                "data: " + json.dumps(e) + "\n\n"
                for e in (events if events is not None else EVENTS)
            )
        )
        return httpx.Response(status, text=text)

    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler), base_url="https://api.anthropic.com"
    )
    return client


@pytest.mark.asyncio
async def test_native_auth_caching_and_usage():
    captured = []
    client = await make_client(captured)
    history = copy.deepcopy(MESSAGES)
    try:
        events = [
            e
            async for e in client.stream_chat(
                messages=history, tools=TOOLS, session_id="a"
            )
        ]
        history.extend(
            [
                {"role": "assistant", "content": "hi"},
                {"role": "user", "content": "More"},
            ]
        )
        _ = [
            e
            async for e in client.stream_chat(
                messages=history, tools=TOOLS, session_id="b"
            )
        ]
    finally:
        await client.close()
    one, two = [json.loads(r.content) for r in captured]
    assert str(captured[0].url) == "https://api.anthropic.com/v1/messages"
    assert captured[0].headers["x-api-key"] == "test-key"
    assert captured[0].headers["anthropic-version"] == "2023-06-01"
    assert "authorization" not in captured[0].headers
    assert one["model"] == "claude-sonnet-5-5"
    assert one["max_tokens"] == 4096
    assert one["cache_control"] == {"type": "ephemeral"}
    assert one["system"][-1]["cache_control"] == {"type": "ephemeral"}
    assert one["system"] == two["system"] and one["tools"] == two["tools"]
    assert one["messages"] == two["messages"][:1]
    assert "session_id" not in one and "session_id" not in two
    assert history[:2] == MESSAGES
    usages = [e["usage"] for e in events if "usage" in e]
    assert len(usages) == 1
    assert usages[0]["prompt_tokens"] == 1300
    assert usages[0]["completion_tokens"] == 10
    assert usages[0]["cost"] == pytest.approx(0.0009)
    assert events[-1] == {"type": "done"}


@pytest.mark.asyncio
async def test_parallel_tool_use_and_results_round_trip():
    events = [START]
    for index, call_id, term in [(1, "t1", 1274), (3, "t2", 1272)]:
        events.extend(
            [
                {
                    "type": "content_block_start",
                    "index": index,
                    "content_block": {
                        "type": "tool_use",
                        "id": call_id,
                        "name": "search_courses",
                        "input": {},
                    },
                },
                {
                    "type": "content_block_delta",
                    "index": index,
                    "delta": {"type": "input_json_delta", "partial_json": '{"term":'},
                },
                {
                    "type": "content_block_delta",
                    "index": index,
                    "delta": {
                        "type": "input_json_delta",
                        "partial_json": str(term) + "}",
                    },
                },
            ]
        )
    events.extend(
        [
            {
                "type": "message_delta",
                "delta": {"stop_reason": "tool_use"},
                "usage": {"output_tokens": 30},
            },
            STOP,
        ]
    )
    client = await make_client([], events)
    try:
        chunks = [e async for e in client.stream_chat(messages=MESSAGES, tools=TOOLS)]
        calls = {}
        for chunk in chunks:
            for tc in (
                chunk.get("choices", [{}])[0].get("delta", {}).get("tool_calls", [])
            ):
                current = calls.setdefault(
                    tc["index"], {"id": "", "function": {"name": "", "arguments": ""}}
                )
                current["id"] = tc.get("id", current["id"])
                for key in ("name", "arguments"):
                    current["function"][key] += tc["function"].get(key, "")
        assert list(calls) == [0, 1]
        assert json.loads(calls[0]["function"]["arguments"]) == {"term": 1274}
        history = MESSAGES + [
            {"role": "assistant", "content": "", "tool_calls": list(calls.values())},
            {"role": "tool", "tool_call_id": "t1", "content": "{}"},
            {"role": "tool", "tool_call_id": "t2", "content": "{}"},
        ]
        wire = client._request(history, TOOLS, None)
        assert [b["id"] for b in wire["messages"][-2]["content"]] == ["t1", "t2"]
        assert [b["tool_use_id"] for b in wire["messages"][-1]["content"]] == [
            "t1",
            "t2",
        ]
        assert wire["tools"][0]["input_schema"] == TOOLS[0]["function"]["parameters"]
    finally:
        await client.close()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status,events,body",
    [
        (402, None, "private billing details"),
        (200, [{"type": "error", "error": {"message": "private account"}}], None),
        (200, EVENTS[:-1], None),
        (
            200,
            [
                START,
                {
                    "type": "message_delta",
                    "delta": {"stop_reason": "max_tokens"},
                    "usage": {"output_tokens": 4096},
                },
                STOP,
            ],
            None,
        ),
    ],
)
async def test_errors_and_incomplete_streams(status, events, body):
    client = await make_client([], events, status, body)
    chunks = []
    try:
        with pytest.raises(LlmClientError) as exc:
            async for event in client.stream_chat(messages=MESSAGES):
                chunks.append(event)
        assert "private" not in str(exc.value)
        assert {"type": "done"} not in chunks
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_nonstreaming_json():
    captured = []
    client = await make_client(
        captured,
        body=json.dumps(
            {
                "content": [{"type": "text", "text": '{"response_text":"Hi"}'}],
                "stop_reason": "end_turn",
            }
        ),
    )
    try:
        assert await client.complete_json(
            system_prompt="Return JSON", user_prompt="Hello"
        ) == {"response_text": "Hi"}
        assert json.loads(captured[0].content)["cache_control"] == {"type": "ephemeral"}
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_rejects_unpriced_models_before_network():
    client = await make_client([])
    try:
        with pytest.raises(LlmClientError, match="Unsupported"):
            _ = [
                e
                async for e in client.stream_chat(
                    messages=MESSAGES, model="anthropic/claude-opus-5"
                )
            ]
    finally:
        await client.close()


def test_haiku_long_context_counts_cache_tokens():
    usage = normalize_usage(
        "claude-haiku-5-5",
        {"input_tokens": 1, "cache_read_input_tokens": 100000, "output_tokens": 10},
    )
    assert usage["cost"] == pytest.approx((0.5 + 100000 * 0.05 + 10 * 2.5) / 1e6)


def test_cache_write_pricing_distinguishes_ttls():
    usage = normalize_usage(
        "claude-sonnet-5-5",
        {
            "cache_creation_input_tokens": 1000,
            "cache_creation": {"ephemeral_1h_input_tokens": 400},
        },
    )
    assert usage["cost"] == pytest.approx((600 * 2.5 + 400 * 4) / 1e6)
