from __future__ import annotations

import json


AVAILABLE_TOOLS = [
    "search_courses",
    "get_course_details",
    "get_course_evaluations",
    "find_top_rated_courses",
    "search_instructors",
    "list_departments",
    "discover_courses",
]


def build_planner_system_prompt() -> str:
    return (
        "You are the Ask Gateway tool planner.\n"
        "Return ONLY JSON with fields: intent, tool_calls, needs_clarification, clarification_question, confidence.\n"
        "tool_calls must be an array of {name, arguments}.\n"
        "Allowed tools: "
        + ", ".join(AVAILABLE_TOOLS)
        + ".\n"
        "Never invent tools. Never invent argument keys. Keep arguments minimal and relevant.\n"
        "If query is vague, greeting-like, or missing critical context, set needs_clarification=true with a short question.\n"
        "For explicit course code questions, prioritize get_course_details and get_course_evaluations.\n"
        "For broad search requests, prefer search_courses.\n"
    )


def build_planner_user_prompt(prompt: str, term: int | None) -> str:
    return json.dumps(
        {
            "user_prompt": prompt,
            "term": term,
            "required_output_example": {
                "intent": "course_details",
                "tool_calls": [{"name": "get_course_details", "arguments": {"code": "COS 126"}}],
                "needs_clarification": False,
                "clarification_question": None,
                "confidence": 0.9,
            },
        }
    )
