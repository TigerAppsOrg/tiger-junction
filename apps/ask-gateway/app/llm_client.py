from __future__ import annotations

import json
from typing import Any

import httpx

from .config import Settings


class LlmClientError(Exception):
    pass


class OpenAiLlmClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.openrouter_base_url,
            timeout=httpx.Timeout(settings.ask_llm_timeout_seconds, connect=settings.connect_timeout_seconds),
        )

    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        raw_text = await self.complete_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            json_mode=True,
        )
        try:
            payload = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise LlmClientError(f"LLM returned invalid JSON: {exc}") from exc
        if not isinstance(payload, dict):
            raise LlmClientError("LLM JSON payload was not an object.")
        return payload

    async def complete_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        json_mode: bool = False,
    ) -> str:
        if not self._settings.openrouter_api_key:
            raise LlmClientError("OPENROUTER_API_KEY is missing.")

        request = {
            "model": model or self._settings.ask_llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if json_mode:
            request["response_format"] = {"type": "json_object"}
        response = await self._client.post(
            "/chat/completions",
            headers={
                "authorization": f"Bearer {self._settings.openrouter_api_key}",
                "content-type": "application/json",
                **(
                    {"http-referer": self._settings.openrouter_site_url}
                    if self._settings.openrouter_site_url
                    else {}
                ),
                **(
                    {"x-title": self._settings.openrouter_app_name}
                    if self._settings.openrouter_app_name
                    else {}
                ),
            },
            json=request,
        )
        if response.status_code >= 400:
            raise LlmClientError(f"OpenRouter HTTP error {response.status_code}: {response.text}")

        payload = response.json()
        try:
            text = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LlmClientError("OpenRouter response format was unexpected.") from exc

        if not isinstance(text, str) or not text.strip():
            raise LlmClientError("OpenRouter returned empty text.")
        return text

    async def close(self) -> None:
        await self._client.aclose()
