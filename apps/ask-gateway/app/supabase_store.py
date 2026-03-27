"""Supabase persistence for quotas, conversations, and messages.

Uses httpx to call Supabase PostgREST API directly — no extra dependencies.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("ask-gateway.store")

_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers() -> dict[str, str]:
    return {
        "apikey": _SUPABASE_KEY,
        "Authorization": f"Bearer {_SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _rest_url(table: str) -> str:
    return f"{_SUPABASE_URL}/rest/v1/{table}"


def _enabled() -> bool:
    return bool(_SUPABASE_URL and _SUPABASE_KEY)


# ── Quotas ─────────────────────────────────────────────────────────────

async def get_quota_spent(netid: str, time_window: str) -> float:
    if not _enabled():
        return 0.0
    async with httpx.AsyncClient() as client:
        r = await client.get(
            _rest_url("ask_quotas"),
            headers={**_headers(), "Accept": "application/json"},
            params={"netid": f"eq.{netid}", "time_window": f"eq.{time_window}", "select": "spent"},
        )
        if r.status_code == 200:
            rows = r.json()
            if rows:
                return float(rows[0].get("spent", 0))
    return 0.0


async def upsert_quota(netid: str, time_window: str, spent: float) -> None:
    if not _enabled():
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            _rest_url("ask_quotas"),
            headers={**_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"netid": netid, "time_window": time_window, "spent": round(spent, 6)},
        )


# ── Conversations ──────────────────────────────────────────────────────

async def upsert_conversation(conv_id: str, netid: str, title: str) -> None:
    if not _enabled():
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            _rest_url("ask_conversations"),
            headers={**_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"id": conv_id, "netid": netid, "title": title[:100], "updated_at": "now()"},
        )


async def update_conversation_timestamp(conv_id: str) -> None:
    if not _enabled():
        return
    async with httpx.AsyncClient() as client:
        await client.patch(
            _rest_url("ask_conversations"),
            headers=_headers(),
            params={"id": f"eq.{conv_id}"},
            json={"updated_at": "now()"},
        )


async def save_message(
    conv_id: str,
    netid: str,
    title: str,
    role: str,
    content: str,
    cost: float | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    model: str | None = None,
) -> None:
    """Save a single message and ensure the conversation exists."""
    if not _enabled():
        return
    try:
        # Ensure conversation exists
        await upsert_conversation(conv_id, netid, title)

        # Insert message
        msg: dict[str, Any] = {
            "conversation_id": conv_id,
            "role": role,
            "content": content,
        }
        if cost is not None:
            msg["cost"] = round(cost, 6)
        if input_tokens is not None:
            msg["input_tokens"] = input_tokens
        if output_tokens is not None:
            msg["output_tokens"] = output_tokens
        if model is not None:
            msg["model"] = model

        async with httpx.AsyncClient() as client:
            await client.post(
                _rest_url("ask_messages"),
                headers=_headers(),
                json=msg,
            )

        # Update conversation timestamp
        await update_conversation_timestamp(conv_id)
    except Exception as e:
        logger.error("Failed to save message: %s", e)


async def list_conversations(netid: str, limit: int = 20) -> list[dict[str, Any]]:
    if not _enabled():
        return []
    async with httpx.AsyncClient() as client:
        r = await client.get(
            _rest_url("ask_conversations"),
            headers={**_headers(), "Accept": "application/json"},
            params={
                "netid": f"eq.{netid}",
                "select": "id,title,created_at,updated_at",
                "order": "updated_at.desc",
                "limit": str(limit),
            },
        )
        if r.status_code == 200:
            return r.json()
    return []


async def get_conversation_messages(
    conv_id: str, netid: str
) -> list[dict[str, Any]] | None:
    """Get messages for a conversation, verifying ownership."""
    if not _enabled():
        return None

    async with httpx.AsyncClient() as client:
        # Verify ownership
        r = await client.get(
            _rest_url("ask_conversations"),
            headers={**_headers(), "Accept": "application/json"},
            params={"id": f"eq.{conv_id}", "netid": f"eq.{netid}", "select": "id"},
        )
        if r.status_code != 200 or not r.json():
            return None

        # Fetch messages
        r = await client.get(
            _rest_url("ask_messages"),
            headers={**_headers(), "Accept": "application/json"},
            params={
                "conversation_id": f"eq.{conv_id}",
                "select": "role,content,cost,input_tokens,output_tokens,model,created_at",
                "order": "created_at.asc",
            },
        )
        if r.status_code == 200:
            return r.json()
    return None
