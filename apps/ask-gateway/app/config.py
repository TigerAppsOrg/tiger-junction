from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    gateway_api_token: str = os.getenv("ASK_GATEWAY_API_TOKEN", "")
    mcp_url: str = os.getenv("JUNCTION_MCP_URL", "http://localhost:3000/mcp")
    junction_mcp_url: str = os.getenv("JUNCTION_MCP_URL_SCHEDULE", "http://localhost:3000/junction/mcp")
    mcp_token: str = os.getenv("JUNCTION_MCP_TOKEN", "")
    mcp_protocol_version: str = os.getenv("MCP_PROTOCOL_VERSION", "2025-03-26")
    tool_timeout_seconds: float = float(os.getenv("ASK_TOOL_TIMEOUT_SECONDS", "10"))
    connect_timeout_seconds: float = float(os.getenv("ASK_CONNECT_TIMEOUT_SECONDS", "5"))
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_base_url: str = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    ask_llm_model: str = os.getenv("ASK_LLM_MODEL", "claude-sonnet-5-5")
    ask_llm_test_model: str = os.getenv("ASK_LLM_TEST_MODEL", "claude-haiku-5-5")
    ask_llm_max_tokens: int = int(os.getenv("ASK_LLM_MAX_TOKENS", "4096"))
    ask_llm_timeout_seconds: float = float(os.getenv("ASK_LLM_TIMEOUT_SECONDS", "60"))
    ask_llm_planner_enabled: bool = _env_bool("ASK_LLM_PLANNER_ENABLED", False)
    ask_llm_synthesis_enabled: bool = _env_bool("ASK_LLM_SYNTHESIS_ENABLED", False)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
