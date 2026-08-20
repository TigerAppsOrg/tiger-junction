from __future__ import annotations

from app.mcp_client import _mcp_tools_to_openai

_MCP_TOOLS = [
    {
        "name": "search_courses",
        "description": "Search the course catalog",
        "inputSchema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "additionalProperties": True,
        },
    },
    {
        "name": "get_course_details",
        "description": "Get details for a course",
        "inputSchema": {
            "type": "object",
            "properties": {"code": {"type": "string"}},
            "additionalProperties": True,
        },
    },
    {
        "name": "get_course_evaluations",
        "description": "Get evaluations for a course",
        "inputSchema": {
            "type": "object",
            "properties": {"code": {"type": "string"}},
            "additionalProperties": True,
        },
    },
    {
        "name": "search_instructors",
        "description": "Search instructors by name",
        "inputSchema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "additionalProperties": True,
        },
    },
]


def test_llm_tool_schema_has_expected_tools() -> None:
    tools = _mcp_tools_to_openai(_MCP_TOOLS)
    names = [tool["function"]["name"] for tool in tools]

    assert "search_courses" in names
    assert "get_course_details" in names
    assert "get_course_evaluations" in names
    assert "search_instructors" in names


def test_llm_tool_schema_uses_object_parameters() -> None:
    tools = _mcp_tools_to_openai(_MCP_TOOLS)
    for tool in tools:
        assert tool["type"] == "function"
        params = tool["function"]["parameters"]
        assert params["type"] == "object"
        assert params["additionalProperties"] is True


def test_llm_tool_schema_skips_nameless_and_defaults_parameters() -> None:
    tools = _mcp_tools_to_openai([{"description": "no name"}, {"name": "bare_tool"}])
    assert len(tools) == 1
    assert tools[0]["function"]["name"] == "bare_tool"
    assert tools[0]["function"]["parameters"] == {"type": "object", "properties": {}}
