from pathlib import Path
import importlib.util
import stat
import pytest

spec = importlib.util.spec_from_file_location(
    "configure_anthropic",
    Path(__file__).resolve().parents[1] / "scripts" / "configure_anthropic.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_config_migration_preserves_other_secrets_and_removes_old_provider(tmp_path):
    path = tmp_path / ".env"
    path.write_text(
        "ASK_GATEWAY_API_TOKEN=keep-me\nOPENROUTER_API_KEY=old\nASK_LLM_MODEL=old\n"
    )
    module.configure_environment(path, "test-key")
    result = path.read_text()
    assert "ASK_GATEWAY_API_TOKEN=keep-me" in result
    assert "OPENROUTER" not in result
    assert "ASK_LLM_MODEL=claude-sonnet-5-5" in result
    assert "ANTHROPIC_API_KEY=test-key" in result
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    module.configure_environment(path, "test-key")
    assert path.read_text() == result


def test_invalid_key_does_not_modify_environment(tmp_path):
    path = tmp_path / ".env"
    path.write_text("EXISTING=value\n")
    with pytest.raises(ValueError):
        module.configure_environment(path, "")
    assert path.read_text() == "EXISTING=value\n"
