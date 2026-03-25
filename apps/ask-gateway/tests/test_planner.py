from __future__ import annotations

from app.chat_service import _build_llm_tools


def test_llm_tool_schema_has_expected_tools() -> None:
    tools = _build_llm_tools()
    names = [tool["function"]["name"] for tool in tools]

    assert "search_courses" in names
    assert "get_course_details" in names
    assert "get_course_evaluations" in names
    assert "search_instructors" in names


def test_llm_tool_schema_uses_object_parameters() -> None:
    tools = _build_llm_tools()
    for tool in tools:
        assert tool["type"] == "function"
        params = tool["function"]["parameters"]
        assert params["type"] == "object"
        assert params["additionalProperties"] is True
