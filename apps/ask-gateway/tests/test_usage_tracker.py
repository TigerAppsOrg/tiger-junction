import pytest

from app.usage_tracker import _build_status


@pytest.mark.parametrize("spent, tier, model, blocked", [
    (0.0, 1, "claude-sonnet-5-5", False),
    (2.999, 1, "claude-sonnet-5-5", False),
    (3.0, 2, "claude-haiku-5-5", False),
    (3.999, 2, "claude-haiku-5-5", False),
    (4.0, "exhausted", "claude-haiku-5-5", True),
])
def test_model_tiers_and_existing_budget_boundaries(spent, tier, model, blocked):
    status = _build_status(spent)
    assert status["tier"] == tier
    assert status["model"] == model
    assert status["blocked"] is blocked
