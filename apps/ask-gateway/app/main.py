from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from .chat_service import ChatService
from .config import Settings
from .models import AskStreamRequest
from .usage_tracker import get_user_usage_async
from . import supabase_store

app = FastAPI(title="Ask Gateway", version="1.0.0")
logger = logging.getLogger("ask-gateway")


def get_settings() -> Settings:
    return Settings()


def get_chat_service(settings: Settings = Depends(get_settings)) -> ChatService:
    return ChatService(settings)


def _validate_gateway_auth(settings: Settings, authorization: str | None) -> None:
    if not settings.gateway_api_token:
        return
    expected = f"Bearer {settings.gateway_api_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized gateway request")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ask/quota")
async def get_quota(
    netid: str,
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    _validate_gateway_auth(settings, authorization)
    if not netid:
        raise HTTPException(status_code=400, detail="netid is required")
    return await get_user_usage_async(netid)


@app.get("/ask/conversations")
async def list_conversations(
    netid: str,
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> list:
    _validate_gateway_auth(settings, authorization)
    if not netid:
        raise HTTPException(status_code=400, detail="netid is required")
    return await supabase_store.list_conversations(netid)


@app.get("/ask/conversations/{conv_id}/messages")
async def get_conversation_messages(
    conv_id: str,
    netid: str,
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> list:
    _validate_gateway_auth(settings, authorization)
    if not netid:
        raise HTTPException(status_code=400, detail="netid is required")
    messages = await supabase_store.get_conversation_messages(conv_id, netid)
    if messages is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return messages


@app.post("/ask/stream")
async def ask_stream(
    payload: AskStreamRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    chat_service: ChatService = Depends(get_chat_service),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    _validate_gateway_auth(settings, authorization)
    disconnect_state = {"value": False}
    request_id = str(uuid.uuid4())
    logger.info(
        "ask_stream.start request_id=%s conversation_id=%s message_count=%s",
        request_id,
        payload.conversationId,
        len(payload.messages),
    )

    async def event_stream():
        async def monitor_disconnect() -> None:
            while not disconnect_state["value"]:
                if await request.is_disconnected():
                    disconnect_state["value"] = True
                    logger.info("ask_stream.client_disconnected request_id=%s", request_id)
                    return
                await asyncio.sleep(0.05)

        monitor_task = asyncio.create_task(monitor_disconnect())
        try:
            async for chunk in chat_service.stream_chat(
                payload,
                is_disconnected=lambda: disconnect_state["value"],
                request_id=request_id,
            ):
                yield chunk
        finally:
            monitor_task.cancel()
            logger.info("ask_stream.finish request_id=%s", request_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
