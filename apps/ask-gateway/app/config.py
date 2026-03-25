from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    gateway_api_token: str = os.getenv("ASK_GATEWAY_API_TOKEN", "")
    mcp_url: str = os.getenv("JUNCTION_MCP_URL", "http://localhost:3000/mcp")
    mcp_token: str = os.getenv("JUNCTION_MCP_TOKEN", "")
    mcp_protocol_version: str = os.getenv("MCP_PROTOCOL_VERSION", "2025-03-26")
    tool_timeout_seconds: float = float(os.getenv("ASK_TOOL_TIMEOUT_SECONDS", "10"))
    connect_timeout_seconds: float = float(os.getenv("ASK_CONNECT_TIMEOUT_SECONDS", "5"))
