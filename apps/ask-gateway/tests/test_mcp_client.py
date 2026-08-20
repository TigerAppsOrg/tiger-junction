from __future__ import annotations

import json
from typing import Callable

import httpx
import pytest

from app.config import Settings
from app.mcp_client import McpClientError, McpHttpClient, _extract_jsonrpc

_MCP_URL = "http://mcp.test/mcp"

_TOOL_RESULT = {"content": [{"type": "text", "text": json.dumps({"count": 0, "courses": []})}]}


def _settings() -> Settings:
    return Settings(tool_timeout_seconds=1, connect_timeout_seconds=1)


def _make_client(handler: Callable[[httpx.Request], httpx.Response]) -> McpHttpClient:
    """Build an McpHttpClient whose HTTP layer is a mock transport."""
    client = McpHttpClient(_settings(), netid="testnetid", mcp_url=_MCP_URL)
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return client


def _sse_body(message: dict) -> str:
    return f"event: message\ndata: {json.dumps(message)}\n\n"


def _handler(
    *,
    session_id: str | None = None,
    plain_json: bool = False,
    reject_initialized_notification: bool = False,
    requests_seen: list[httpx.Request] | None = None,
) -> Callable[[httpx.Request], httpx.Response]:
    """Simulate an MCP server; sessionful when session_id is set, else stateless."""

    def handler(request: httpx.Request) -> httpx.Response:
        if requests_seen is not None:
            requests_seen.append(request)

        if request.method == "DELETE":
            if session_id is None:
                return httpx.Response(405, text="Method Not Allowed")
            return httpx.Response(200)

        body = json.loads(request.content)
        method = body.get("method")

        if method == "notifications/initialized":
            if reject_initialized_notification:
                return httpx.Response(400, text="notifications not accepted")
            return httpx.Response(202)

        if method == "initialize":
            message = {
                "jsonrpc": "2.0",
                "id": body["id"],
                "result": {"protocolVersion": "2025-03-26", "capabilities": {}},
            }
            headers = {"mcp-session-id": session_id} if session_id else {}
        elif method == "tools/list":
            message = {
                "jsonrpc": "2.0",
                "id": body["id"],
                "result": {"tools": [{"name": "search_courses", "description": "", "inputSchema": {"type": "object", "properties": {}}}]},
            }
            headers = {}
        else:  # tools/call
            message = {"jsonrpc": "2.0", "id": body["id"], "result": _TOOL_RESULT}
            headers = {}

        if plain_json:
            return httpx.Response(200, json=message, headers=headers)
        return httpx.Response(
            200,
            text=_sse_body(message),
            headers={"content-type": "text/event-stream", **headers},
        )

    return handler


@pytest.mark.asyncio
async def test_initialize_without_session_header_succeeds() -> None:
    """Stateless v2 servers return no mcp-session-id; the client must proceed."""
    seen: list[httpx.Request] = []
    client = _make_client(_handler(session_id=None, requests_seen=seen))

    session_id = await client.initialize()

    assert session_id is None
    result = await client.call_tool("search_courses", {"query": "cs"})
    assert result == _TOOL_RESULT

    # No session header on any request, ever.
    assert all("mcp-session-id" not in r.headers for r in seen)
    await client.close()


@pytest.mark.asyncio
async def test_initialize_with_session_header_captures_session() -> None:
    """Sessionful 2025-era servers still get their session id echoed back."""
    seen: list[httpx.Request] = []
    client = _make_client(_handler(session_id="abc123", requests_seen=seen))

    session_id = await client.initialize()

    assert session_id == "abc123"
    assert client.session_id == "abc123"
    await client.call_tool("search_courses", {"query": "cs"})

    # Every request after initialize carries the session id.
    post_handshake = seen[1:]
    assert post_handshake
    assert all(r.headers.get("mcp-session-id") == "abc123" for r in post_handshake)
    await client.close()


@pytest.mark.asyncio
async def test_protocol_version_header_sent_on_all_requests() -> None:
    seen: list[httpx.Request] = []
    client = _make_client(_handler(session_id=None, requests_seen=seen))

    await client.initialize()
    await client.call_tool("search_courses", {})
    await client.close()

    assert seen
    expected = _settings().mcp_protocol_version
    assert all(r.headers.get("mcp-protocol-version") == expected for r in seen)


@pytest.mark.asyncio
async def test_rejected_initialized_notification_does_not_break_flow() -> None:
    client = _make_client(_handler(session_id=None, reject_initialized_notification=True))

    session_id = await client.initialize()

    assert session_id is None
    result = await client.call_tool("search_courses", {})
    assert result == _TOOL_RESULT
    await client.close()


@pytest.mark.asyncio
async def test_call_tool_parses_plain_json_response() -> None:
    client = _make_client(_handler(session_id=None, plain_json=True))

    await client.initialize()
    result = await client.call_tool("search_courses", {"query": "cs"})

    assert result == _TOOL_RESULT
    await client.close()


@pytest.mark.asyncio
async def test_call_tool_parses_sse_response() -> None:
    client = _make_client(_handler(session_id="abc123", plain_json=False))

    await client.initialize()
    result = await client.call_tool("search_courses", {"query": "cs"})

    assert result == _TOOL_RESULT
    await client.close()


@pytest.mark.asyncio
async def test_close_treats_405_delete_as_expected() -> None:
    """A stateless server answers DELETE with 405; close() must stay silent."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "DELETE":
            return httpx.Response(405, text="Method Not Allowed")
        body = json.loads(request.content)
        if body.get("method") == "notifications/initialized":
            return httpx.Response(202)
        return httpx.Response(
            200,
            json={"jsonrpc": "2.0", "id": body["id"], "result": {}},
            headers={"mcp-session-id": "stale-session"},
        )

    client = _make_client(handler)
    await client.initialize()
    # Session id present, so close() attempts the DELETE; 405 must not raise.
    await client.close()


@pytest.mark.asyncio
async def test_list_tools_initializes_stateless_session_once() -> None:
    from app import mcp_client as mcp_client_module

    mcp_client_module._tools_cache.clear()
    seen: list[httpx.Request] = []
    client = _make_client(_handler(session_id=None, requests_seen=seen))

    tools = await client.list_tools()

    assert tools and tools[0]["function"]["name"] == "search_courses"
    init_calls = [
        r for r in seen if json.loads(r.content).get("method") == "initialize"
    ]
    assert len(init_calls) == 1
    await client.close()


def test_extract_jsonrpc_sse_body() -> None:
    message = {"jsonrpc": "2.0", "id": 7, "result": {"ok": True}}
    raw = "event: message\ndata: " + json.dumps(message) + "\n\n"
    assert _extract_jsonrpc(raw, expected_id=7) == message


def test_extract_jsonrpc_plain_json_object() -> None:
    message = {"jsonrpc": "2.0", "id": 3, "result": {"ok": True}}
    assert _extract_jsonrpc(json.dumps(message), expected_id=3) == message


def test_extract_jsonrpc_plain_json_array() -> None:
    wanted = {"jsonrpc": "2.0", "id": 2, "result": {"ok": True}}
    other = {"jsonrpc": "2.0", "id": 1, "result": {}}
    assert _extract_jsonrpc(json.dumps([other, wanted]), expected_id=2) == wanted


def test_extract_jsonrpc_rejects_garbage() -> None:
    with pytest.raises(McpClientError):
        _extract_jsonrpc("not json at all", expected_id=1)


def test_extract_jsonrpc_missing_id_raises() -> None:
    message = {"jsonrpc": "2.0", "id": 99, "result": {}}
    with pytest.raises(McpClientError):
        _extract_jsonrpc(json.dumps(message), expected_id=1)


@pytest.mark.asyncio
async def test_initialize_adopts_negotiated_protocol_version() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        body = json.loads(request.content)
        if body.get("method") == "notifications/initialized":
            return httpx.Response(202)
        message = {
            "jsonrpc": "2.0",
            "id": body["id"],
            "result": {"protocolVersion": "2026-07-28", "capabilities": {}},
        }
        if body.get("method") == "tools/list":
            message["result"] = {"tools": []}
        return httpx.Response(200, json=message)

    client = _make_client(handler)
    await client.initialize()
    # initialize itself advertises the configured version...
    assert seen[0].headers["mcp-protocol-version"] == "2025-03-26"
    await client.call_tool("x", {})
    # ...but later requests carry the server-negotiated version.
    assert seen[-1].headers["mcp-protocol-version"] == "2026-07-28"
    await client.close()


@pytest.mark.asyncio
async def test_initialize_raises_on_jsonrpc_error_body() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        message = {
            "jsonrpc": "2.0",
            "id": body.get("id"),
            "error": {"code": -32602, "message": "Unsupported protocol version"},
        }
        return httpx.Response(200, json=message)

    client = _make_client(handler)
    with pytest.raises(McpClientError, match="initialize failed"):
        await client.initialize()
    await client.close()


def test_extract_jsonrpc_multiline_sse_data() -> None:
    message = {"jsonrpc": "2.0", "id": 4, "result": {"ok": True}}
    encoded = json.dumps(message, indent=1)
    lines = "\n".join("data: " + line for line in encoded.splitlines())
    raw = "event: message\n" + lines + "\n\n"
    assert _extract_jsonrpc(raw, expected_id=4) == message
