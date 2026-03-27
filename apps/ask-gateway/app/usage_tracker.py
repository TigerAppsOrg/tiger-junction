"""Per-user usage tracking with tiered quota system, persisted to Supabase.

Tier 1: Claude Sonnet 4.6 — $0.50 budget
Tier 2: Claude Haiku 4.5 — $0.25 budget (auto-downgrade when Tier 1 exhausted)
Exhausted: No more requests until next 8-hour window

Resets at 12:00 AM, 8:00 AM, 4:00 PM US Eastern.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from . import supabase_store

logger = logging.getLogger("ask-gateway.usage")

TIER1_MODEL = "anthropic/claude-sonnet-4.6"
TIER2_MODEL = "anthropic/claude-haiku-4.5"
TIER1_BUDGET = 0.50
TIER2_BUDGET = 0.25
TOTAL_BUDGET = TIER1_BUDGET + TIER2_BUDGET  # $0.75
WINDOW_HOURS = 8

_ET_OFFSET = timezone(timedelta(hours=-5))


def _now_et() -> datetime:
    return datetime.now(_ET_OFFSET)


def _get_window_id() -> str:
    now = _now_et()
    window_index = now.hour // WINDOW_HOURS
    return f"{now.strftime('%Y-%m-%d')}-{window_index}"


def _seconds_until_next_window() -> int:
    now = _now_et()
    window_index = now.hour // WINDOW_HOURS
    next_hour = (window_index + 1) * WINDOW_HOURS
    if next_hour >= 24:
        tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        return max(1, int((tomorrow - now).total_seconds()))
    next_boundary = now.replace(hour=next_hour, minute=0, second=0, microsecond=0)
    return max(1, int((next_boundary - now).total_seconds()))


def _build_status(spent: float) -> dict[str, Any]:
    if spent < TIER1_BUDGET:
        tier = 1
        model = TIER1_MODEL
        blocked = False
    elif spent < TOTAL_BUDGET:
        tier = 2
        model = TIER2_MODEL
        blocked = False
    else:
        tier = "exhausted"
        model = TIER2_MODEL
        blocked = True

    percent_used = min(100, round((spent / TOTAL_BUDGET) * 100, 1))
    reset_seconds = _seconds_until_next_window()

    return {
        "spent": round(spent, 4),
        "tier": tier,
        "model": model,
        "blocked": blocked,
        "percentUsed": percent_used,
        "resetSeconds": reset_seconds,
        "window": _get_window_id(),
    }


def get_user_usage(netid: str) -> dict[str, Any]:
    """Synchronous wrapper — reads from Supabase."""
    window = _get_window_id()
    try:
        spent = asyncio.get_event_loop().run_until_complete(
            supabase_store.get_quota_spent(netid, window)
        )
    except RuntimeError:
        # If no event loop, create one (shouldn't happen in FastAPI)
        spent = asyncio.run(supabase_store.get_quota_spent(netid, window))
    return _build_status(spent)


async def get_user_usage_async(netid: str) -> dict[str, Any]:
    """Async version for use in async handlers."""
    window = _get_window_id()
    spent = await supabase_store.get_quota_spent(netid, window)
    return _build_status(spent)


def resolve_model_for_user(netid: str) -> dict[str, Any]:
    return get_user_usage(netid)


async def resolve_model_for_user_async(netid: str) -> dict[str, Any]:
    return await get_user_usage_async(netid)


async def record_usage_async(netid: str, cost: float) -> None:
    if cost <= 0:
        return
    window = _get_window_id()
    current = await supabase_store.get_quota_spent(netid, window)
    new_spent = current + cost
    await supabase_store.upsert_quota(netid, window, new_spent)
    logger.info("usage.record netid=%s cost=%.4f total=%.4f window=%s", netid, cost, new_spent, window)


def record_usage(netid: str, cost: float) -> None:
    """Synchronous wrapper."""
    if cost <= 0:
        return
    try:
        asyncio.get_event_loop().run_until_complete(record_usage_async(netid, cost))
    except RuntimeError:
        asyncio.run(record_usage_async(netid, cost))
