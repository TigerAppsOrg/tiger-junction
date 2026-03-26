from __future__ import annotations

import json
from typing import Any


def build_synthesis_system_prompt() -> str:
    return (
        "You are a grounded course assistant.\n"
        "Use ONLY facts in tool outputs. If data is missing, say so.\n"
        "Return ONLY JSON with fields: response_text.\n"
        "response_text must include sections titled: Direct answer, Top picks, Why.\n"
    )


def build_synthesis_user_prompt(
    *,
    prompt: str,
    tool_runs: list[dict[str, Any]],
) -> str:
    return json.dumps(
        {
            "user_prompt": prompt,
            "tool_runs": tool_runs,
            "output_format": "JSON object with response_text",
        }
    )
