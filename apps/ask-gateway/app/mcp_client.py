from __future__ import annotations

import json
from typing import Any

import httpx

from .config import Settings


class McpClientError(Exception):
    pass


class McpHttpClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session_id: str | None = None
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.tool_timeout_seconds, connect=settings.connect_timeout_seconds)
        )
        self._next_id = 1

    async def initialize(self) -> str:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next(),
            "method": "initialize",
            "params": {
                "protocolVersion": self._settings.mcp_protocol_version,
                "capabilities": {},
                "clientInfo": {"name": "ask-gateway", "version": "1.0.0"},
            },
        }
        response = await self._post(payload)
        self._session_id = response.headers.get("mcp-session-id")
        if not self._session_id:
            raise McpClientError("MCP initialize succeeded but no mcp-session-id header was returned.")
        await self._post({"jsonrpc": "2.0", "method": "notifications/initialized"})
        return self._session_id

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next(),
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        response = await self._post(payload)
        message = _extract_jsonrpc(response.text, expected_id=payload["id"])
        if "error" in message:
            raise McpClientError(f"MCP tool call failed: {message['error']}")
        result = message.get("result", {})
        if not isinstance(result, dict):
            raise McpClientError("Unexpected MCP tool result payload.")
        return result

    async def close(self) -> None:
        try:
            if self._session_id:
                await self._client.delete(
                    self._settings.mcp_url,
                    headers=self._headers(include_session=True),
                )
        finally:
            await self._client.aclose()

    def _next(self) -> int:
        current = self._next_id
        self._next_id += 1
        return current

    async def _post(self, payload: dict[str, Any]) -> httpx.Response:
        response = await self._client.post(
            self._settings.mcp_url,
            headers=self._headers(include_session=True),
            json=payload,
        )
        if response.status_code >= 400:
            raise McpClientError(f"MCP HTTP error {response.status_code}: {response.text}")
        return response

    def _headers(self, include_session: bool) -> dict[str, str]:
        headers = {
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
        }
        if self._settings.mcp_token:
            headers["authorization"] = f"Bearer {self._settings.mcp_token}"
        if include_session and self._session_id:
            headers["mcp-session-id"] = self._session_id
            headers["mcp-protocol-version"] = self._settings.mcp_protocol_version
        return headers


def _extract_jsonrpc(raw: str, expected_id: int) -> dict[str, Any]:
    for line in raw.splitlines():
        if not line.startswith("data: "):
            continue
        payload = json.loads(line[6:])
        if payload.get("id") == expected_id:
            return payload
    raise McpClientError(f"MCP response did not include JSON-RPC message for id {expected_id}.")
