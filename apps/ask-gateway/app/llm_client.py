"""Direct Anthropic Messages API, adapted to the gateway's internal stream events."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx

from .config import Settings


class LlmClientError(Exception):
    pass


# USD per million tokens, verified against Anthropic pricing on 2026-10-29.
# Reject unpriced models rather than silently allowing unmetered requests.
MODEL_RATES = {
    "claude-sonnet-5-5": (2.0, 10.0, 0.10),
    "claude-haiku-5-5": (0.10, 0.50, 0.01),
}


def normalize_usage(model: str, usage: dict[str, Any]) -> dict[str, Any]:
    uncached = usage.get("input_tokens", 0)
    created = usage.get("cache_creation_input_tokens", 0)
    read = usage.get("cache_read_input_tokens", 0)
    output = usage.get("output_tokens", 0)
    total_input = uncached + created + read
    input_rate, output_rate, read_rate = MODEL_RATES[model]
    if model == "claude-haiku-5-5" and total_input > 100_000:
        input_rate, output_rate, read_rate = 0.50, 2.50, 0.05
    creation = usage.get("cache_creation") or {}
    hour_writes = creation.get("ephemeral_1h_input_tokens", 0)
    short_writes = created - hour_writes
    cost = (
        uncached * input_rate
        + short_writes * input_rate * 1.25
        + hour_writes * input_rate * 2
        + read * read_rate
        + output * output_rate
    ) / 1_000_000
    return {
        "prompt_tokens": total_input,
        "completion_tokens": output,
        "prompt_tokens_details": {"cached_tokens": read},
        "cache_creation_input_tokens": created,
        "cache_read_input_tokens": read,
        "cost": cost,
    }


class AnthropicLlmClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.anthropic_base_url,
            timeout=httpx.Timeout(
                settings.ask_llm_timeout_seconds,
                connect=settings.connect_timeout_seconds,
            ),
        )

    def _request(self, messages, tools, model) -> dict[str, Any]:
        if not self._settings.anthropic_api_key:
            raise LlmClientError("ANTHROPIC_API_KEY is missing.")
        model = model or self._settings.ask_llm_model
        if model not in MODEL_RATES:
            raise LlmClientError(
                "Unsupported Claude model. Use the configured Sonnet or Haiku tier."
            )
        system = []
        history: list[dict[str, Any]] = []
        for message in messages:
            role = message["role"]
            text = message.get("content") or ""
            if role == "system":
                system.append({"type": "text", "text": text})
                continue
            if role == "tool":
                role = "user"
                blocks = [
                    {
                        "type": "tool_result",
                        "tool_use_id": message["tool_call_id"],
                        "content": text,
                    }
                ]
            else:
                blocks = [{"type": "text", "text": text}] if text else []
                for call in message.get("tool_calls", []):
                    try:
                        arguments = json.loads(call["function"]["arguments"] or "{}")
                    except (ValueError, TypeError) as exc:
                        raise LlmClientError(
                            "Invalid tool-call arguments in conversation history."
                        ) from exc
                    blocks.append(
                        {
                            "type": "tool_use",
                            "id": call["id"],
                            "name": call["function"]["name"],
                            "input": arguments,
                        }
                    )
            if not blocks:
                continue
            # Parallel tool results must immediately follow their tool_use blocks
            # in a single user message. Preserve block order across iterations.
            if history and history[-1]["role"] == role:
                history[-1]["content"].extend(blocks)
            else:
                history.append({"role": role, "content": blocks})
        cache = {"type": "ephemeral"}  # 5m TTL; hits refresh it without another write.
        if system:
            system[-1]["cache_control"] = cache.copy()
        request: dict[str, Any] = {
            "model": model,
            "max_tokens": self._settings.ask_llm_max_tokens,
            "messages": history,
            "cache_control": cache,  # Automatically advances with growing history.
        }
        if system:
            request["system"] = system
        if tools:
            request["tools"] = [
                {
                    "name": tool["function"]["name"],
                    "description": tool["function"].get("description", ""),
                    "input_schema": tool["function"].get(
                        "parameters", {"type": "object", "properties": {}}
                    ),
                }
                for tool in sorted(tools, key=lambda t: t["function"]["name"])
            ]
            request["tool_choice"] = {"type": "auto"}
        return request

    def _headers(self):
        return {
            "x-api-key": self._settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    @staticmethod
    def _http_error(status: int) -> LlmClientError:
        # Never forward raw provider bodies, credentials, or account details to clients.
        return LlmClientError(
            f"Claude API request failed (HTTP {status}). Please try again or contact support."
        )

    async def stream_chat(
        self,
        *,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
        session_id: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        # Messages is stateless: replay history, not an OpenRouter session_id.
        # Conversation IDs never enter the cached prefix.
        request = self._request(messages, tools, model)
        request["stream"] = True
        usage: dict[str, Any] = {}
        tool_indices: dict[int, int] = {}
        stop_reason = None
        try:
            async with self._client.stream(
                "POST", "/v1/messages", headers=self._headers(), json=request
            ) as response:
                if response.status_code >= 400:
                    await response.aread()
                    raise self._http_error(response.status_code)
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    try:
                        event = json.loads(line[5:].strip())
                    except ValueError as exc:
                        raise LlmClientError(
                            "Claude returned an invalid stream event."
                        ) from exc
                    kind = event.get("type")
                    delta: dict[str, Any] = {}
                    if kind == "error":
                        raise LlmClientError(
                            "Claude reported a streaming error. Please retry."
                        )
                    if kind == "message_start":
                        usage.update(event["message"].get("usage", {}))
                    elif kind == "content_block_start":
                        block = event["content_block"]
                        if block["type"] == "tool_use":
                            index = len(tool_indices)
                            tool_indices[event["index"]] = index
                            delta = {
                                "tool_calls": [
                                    {
                                        "index": index,
                                        "id": block["id"],
                                        "function": {
                                            "name": block["name"],
                                            "arguments": "",
                                        },
                                    }
                                ]
                            }
                        elif block["type"] == "text" and block.get("text"):
                            delta = {"content": block["text"]}
                    elif kind == "content_block_delta":
                        block = event["delta"]
                        if block["type"] == "text_delta":
                            delta = {"content": block["text"]}
                        elif block["type"] == "input_json_delta":
                            delta = {
                                "tool_calls": [
                                    {
                                        "index": tool_indices[event["index"]],
                                        "function": {
                                            "arguments": block["partial_json"]
                                        },
                                    }
                                ]
                            }
                    elif kind == "message_delta":
                        usage.update(
                            event.get("usage", {})
                        )  # Output usage is cumulative.
                        stop_reason = event["delta"].get("stop_reason")
                    elif kind == "message_stop":
                        # Emit usage once per API call, including cache writes/reads.
                        yield {"usage": normalize_usage(request["model"], usage)}
                        if stop_reason not in {"end_turn", "tool_use"}:
                            raise LlmClientError(
                                "Claude did not finish its response. Please retry with a narrower question."
                            )
                        yield {
                            "choices": [
                                {
                                    "delta": {},
                                    "finish_reason": "tool_calls"
                                    if stop_reason == "tool_use"
                                    else "stop",
                                }
                            ]
                        }
                        yield {"type": "done"}
                        return
                    if delta:
                        yield {"choices": [{"delta": delta, "finish_reason": None}]}
                raise LlmClientError(
                    "Claude stream ended before completion. Please retry."
                )
        except httpx.HTTPError as exc:
            raise LlmClientError("Could not reach Claude. Please try again.") from exc

    async def complete_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        json_mode: bool = False,
    ) -> str:
        if json_mode:
            system_prompt += (
                "\nReturn only a valid JSON object, without markdown fences."
            )
        request = self._request(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            None,
            model,
        )
        try:
            response = await self._client.post(
                "/v1/messages", headers=self._headers(), json=request
            )
        except httpx.HTTPError as exc:
            raise LlmClientError("Could not reach Claude. Please try again.") from exc
        if response.status_code >= 400:
            raise self._http_error(response.status_code)
        try:
            data = response.json()
            text = "".join(
                block["text"] for block in data["content"] if block["type"] == "text"
            )
            if data.get("stop_reason") != "end_turn" or not text.strip():
                raise ValueError("Incomplete response")
            return text
        except (KeyError, TypeError, ValueError) as exc:
            raise LlmClientError(
                "Claude returned an incomplete or unexpected response."
            ) from exc

    async def complete_json(
        self, *, system_prompt: str, user_prompt: str
    ) -> dict[str, Any]:
        text = await self.complete_text(
            system_prompt=system_prompt, user_prompt=user_prompt, json_mode=True
        )
        try:
            data = json.loads(text)
            if not isinstance(data, dict):
                raise ValueError("Expected object")
            return data
        except ValueError as exc:
            raise LlmClientError("Claude returned invalid JSON.") from exc

    async def close(self) -> None:
        await self._client.aclose()
