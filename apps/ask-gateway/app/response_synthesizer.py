from __future__ import annotations

import json
from typing import Any

from .llm_client import LlmClientError, OpenAiLlmClient
from .synthesis_prompt import build_synthesis_system_prompt, build_synthesis_user_prompt

COURSE_LIST_TOOLS = {"search_courses", "discover_courses", "find_top_rated_courses"}
TOP_PICK_LIMIT = 5


def synthesize_tool_response(tool_name: str, prompt: str, result: dict[str, Any]) -> str:
    parsed_payload = _extract_tool_payload(result)
    if parsed_payload is None:
        return _malformed_payload_response()

    if tool_name == "get_course_details":
        return _synthesize_course_details_response(parsed_payload)
    if tool_name == "get_course_evaluations":
        return _synthesize_course_evaluations_response(parsed_payload)

    if tool_name in COURSE_LIST_TOOLS:
        return _synthesize_course_list_response(prompt, parsed_payload)

    return _synthesize_generic_response(tool_name, parsed_payload)


async def synthesize_final_response(
    *,
    prompt: str,
    tool_runs: list[dict[str, Any]],
    llm_client: OpenAiLlmClient | None,
    llm_enabled: bool,
) -> str:
    deterministic = _compose_deterministic_response(prompt=prompt, tool_runs=tool_runs)
    if not llm_enabled or llm_client is None:
        return deterministic

    try:
        payload = await llm_client.complete_json(
            system_prompt=build_synthesis_system_prompt(),
            user_prompt=build_synthesis_user_prompt(prompt=prompt, tool_runs=tool_runs),
        )
    except LlmClientError:
        return deterministic

    response_text = payload.get("response_text")
    if not isinstance(response_text, str) or not response_text.strip():
        return deterministic
    return response_text.strip()


def _compose_deterministic_response(*, prompt: str, tool_runs: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for run in tool_runs:
        tool_name = run.get("name")
        result = run.get("result")
        if isinstance(tool_name, str) and isinstance(result, dict):
            parts.append(synthesize_tool_response(tool_name, prompt, result))

    return (
        "\n\n".join(parts)
        or "Direct answer: I could not run any tools for this request."
    )


def _extract_tool_payload(result: dict[str, Any]) -> dict[str, Any] | None:
    content = result.get("content")
    if not isinstance(content, list):
        return None

    text_blocks: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            text_blocks.append(text.strip())

    if not text_blocks:
        return None

    for text in text_blocks:
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    if len(text_blocks) == 1:
        return {"text": text_blocks[0]}

    return {"texts": text_blocks}


def _synthesize_course_list_response(prompt: str, payload: dict[str, Any]) -> str:
    if "courses" not in payload:
        return _malformed_payload_response()

    candidates = _normalize_courses(payload)
    if not candidates:
        return (
            "Direct answer: I could not find strong course matches for your request yet.\n"
            "Top picks:\n"
            "- No reliable matches were returned.\n"
            "Why:\n"
            "- Try adding filters like department, term, or words like no final, morning, or instructor name."
        )

    easy_mode = _prompt_hints_easy(prompt)
    ranked = sorted(candidates, key=lambda course: _course_score(course, easy_mode), reverse=True)
    picks = ranked[:TOP_PICK_LIMIT]

    lines = [
        f'Direct answer: I found {len(candidates)} relevant course options for "{prompt}".',
        "Top picks:",
    ]
    for course in picks:
        lines.append(f"- {_course_label(course)}")

    lines.append("Why:")
    for course in picks:
        lines.append(f"- {course['code']}: {_course_reason(course, easy_mode)}")

    return "\n".join(lines)


def _normalize_courses(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_courses = payload.get("courses")
    if not isinstance(raw_courses, list):
        return []

    normalized: list[dict[str, Any]] = []
    for raw in raw_courses:
        if not isinstance(raw, dict):
            continue

        code = raw.get("code")
        title = raw.get("title")
        if not isinstance(code, str) or not isinstance(title, str):
            continue

        normalized.append(
            {
                "code": code,
                "title": title,
                "status": str(raw.get("status", "unknown")).lower(),
                "term": raw.get("term"),
                "hasFinal": raw.get("hasFinal"),
                "rating": _to_float(raw.get("latestRating", raw.get("rating"))),
            }
        )

    return normalized


def _synthesize_generic_response(tool_name: str, payload: dict[str, Any]) -> str:
    sample = payload.get("text")
    if isinstance(sample, str):
        truncated = sample if len(sample) <= 220 else f"{sample[:217]}..."
        return (
            f"Direct answer: I pulled results from {tool_name}.\n"
            "Top picks:\n"
            f"- {truncated}\n"
            "Why:\n"
            "- This is the most direct result available from the current tool output."
        )

    return (
        f"Direct answer: I pulled data from {tool_name}.\n"
        "Top picks:\n"
        "- Results were returned, but not in a course list format.\n"
        "Why:\n"
        "- This tool is best used for supporting data rather than ranked course recommendations."
    )


def _synthesize_course_details_response(payload: dict[str, Any]) -> str:
    code = payload.get("code")
    title = payload.get("title")
    description = payload.get("description")
    has_final = payload.get("hasFinal")
    if not isinstance(code, str) or not isinstance(title, str):
        return _malformed_payload_response()

    final_note = "has a final exam" if has_final is True else "does not list a final exam" if has_final is False else "final exam info is not available"
    short_description = description.strip() if isinstance(description, str) and description.strip() else "No course description was provided."

    return (
        f"Direct answer: {code} ({title}) is a real match for your question.\n"
        "Top picks:\n"
        f"- {code} - {title}\n"
        "Why:\n"
        f"- Course info: {short_description}\n"
        f"- Workload note: this tool does not provide exact weekly hours, and it {final_note}."
    )


def _synthesize_course_evaluations_response(payload: dict[str, Any]) -> str:
    evaluations = payload.get("evaluations")
    if not isinstance(evaluations, list) or not evaluations:
        return (
            "Direct answer: I could not find evaluation records for this course yet.\n"
            "Top picks:\n"
            "- No evaluation terms were returned.\n"
            "Why:\n"
            "- Try again with a specific term or verify the course code."
        )

    ratings = [float(e["rating"]) for e in evaluations if isinstance(e, dict) and isinstance(e.get("rating"), (int, float))]
    avg_rating = sum(ratings) / len(ratings) if ratings else None
    term_count = len(evaluations)

    workload_signals: list[str] = []
    for entry in evaluations:
        if not isinstance(entry, dict):
            continue
        summary = entry.get("summary")
        if isinstance(summary, str) and summary.strip():
            lowered = summary.lower()
            if "workload" in lowered or "challeng" in lowered or "heavy" in lowered or "light" in lowered:
                workload_signals.append(summary.strip())
            if len(workload_signals) == 2:
                break

    rating_line = (
        f"- Evaluation trend: average rating is about {avg_rating:.2f} across {term_count} term(s)."
        if avg_rating is not None
        else f"- Evaluation trend: {term_count} term(s) have comments but no numeric rating."
    )
    workload_line = (
        f"- Workload signal: {workload_signals[0]}"
        if workload_signals
        else "- Workload signal: comments are available, but no explicit workload summary was found."
    )

    return (
        "Direct answer: Here is what evaluations say for this course.\n"
        "Top picks:\n"
        f"{rating_line}\n"
        "Why:\n"
        f"{workload_line}"
    )


def _malformed_payload_response() -> str:
    return (
        "Direct answer: I could not safely read the tool output for this request.\n"
        "Top picks:\n"
        "- No reliable recommendations are available yet.\n"
        "Why:\n"
        "- The upstream data was empty or malformed. Try rephrasing your query with a department, term, or course code."
    )


def _course_label(course: dict[str, Any]) -> str:
    status = course["status"] if course["status"] else "unknown"
    extras: list[str] = [f"status: {status}"]
    if course.get("term") is not None:
        extras.append(f"term: {course['term']}")
    return f"{course['code']} - {course['title']} ({', '.join(extras)})"


def _course_reason(course: dict[str, Any], easy_mode: bool) -> str:
    reasons: list[str] = []
    if course["status"] == "open":
        reasons.append("currently open")
    elif course["status"] != "unknown":
        reasons.append(f"status is {course['status']}")

    rating = course.get("rating")
    if isinstance(rating, float):
        reasons.append(f"rated around {rating:.1f}")

    has_final = course.get("hasFinal")
    if easy_mode and has_final is False:
        reasons.append("no final exam")
    elif easy_mode and has_final is True:
        reasons.append("has a final exam")

    if not reasons:
        reasons.append("matches the query keywords")
    return ", ".join(reasons)


def _course_score(course: dict[str, Any], easy_mode: bool) -> float:
    score = 0.0
    if course["status"] == "open":
        score += 3.0
    elif course["status"] == "closed":
        score -= 1.0

    rating = course.get("rating")
    if isinstance(rating, float):
        score += min(rating / 2.0, 2.5)

    has_final = course.get("hasFinal")
    if easy_mode and has_final is False:
        score += 2.0
    if easy_mode and has_final is True:
        score -= 0.5

    return score


def _prompt_hints_easy(prompt: str) -> bool:
    lowered = prompt.lower()
    hints = ("easy", "easiest", "light", "low workload", "no final", "without final")
    return any(hint in lowered for hint in hints)


def _to_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None
