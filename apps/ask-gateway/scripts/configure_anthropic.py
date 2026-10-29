"""Load the direct API credential from SSM without exposing it in deployment logs."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile

PARAMETER = "/ask-gateway/production/ANTHROPIC_API_KEY"


def configure_environment(path: Path, api_key: str) -> None:
    if not api_key or "\n" in api_key or "\r" in api_key:
        raise ValueError("Invalid Anthropic credential")
    overrides = {
        "ANTHROPIC_API_KEY": api_key,
        "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
        "ASK_LLM_MODEL": "claude-sonnet-5-5",
        "ASK_LLM_TEST_MODEL": "claude-haiku-5-5",
        "ASK_LLM_MAX_TOKENS": "4096",
        "ASK_LLM_TIMEOUT_SECONDS": "60",
    }
    lines = [
        line
        for line in path.read_text().splitlines()
        if line.split("=", 1)[0].strip() not in overrides
        and not line.lstrip().startswith(("OPENROUTER_", "OPENAI_API_KEY="))
    ]
    lines.extend(f"{key}={value}" for key, value in overrides.items())
    fd, temporary = tempfile.mkstemp(prefix=".env-anthropic-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as file:
            file.write("\n".join(lines) + "\n")
        os.replace(temporary, path)  # Same directory; atomic, with mode 0600.
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> None:
    result = subprocess.run(
        [
            "aws",
            "--region",
            "us-east-1",
            "ssm",
            "get-parameters",
            "--names",
            PARAMETER,
            "--with-decryption",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError("Could not load the Anthropic credential from SSM")
    parameters = json.loads(result.stdout).get("Parameters", [])
    if len(parameters) != 1 or parameters[0]["Name"] != PARAMETER:
        raise RuntimeError("Anthropic credential is missing from SSM")
    configure_environment(Path(".env"), parameters[0]["Value"])
    print("Anthropic configuration loaded from SSM")


if __name__ == "__main__":
    main()
