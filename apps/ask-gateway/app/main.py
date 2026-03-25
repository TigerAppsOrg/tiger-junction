from __future__ import annotations

import asyncio

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from .chat_service import ChatService
from .config import Settings
from .models import AskStreamRequest

app = FastAPI(title="Ask Gateway", version="1.0.0")


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

    async def event_stream():
        async def monitor_disconnect() -> None:
            while not disconnect_state["value"]:
                if await request.is_disconnected():
                    disconnect_state["value"] = True
                    return
                await asyncio.sleep(0.05)

        monitor_task = asyncio.create_task(monitor_disconnect())
        try:
            async for chunk in chat_service.stream_chat(
                payload, is_disconnected=lambda: disconnect_state["value"]
            ):
                yield chunk
        finally:
            monitor_task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
