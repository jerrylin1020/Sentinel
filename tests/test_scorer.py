from packages.scanner.scorer import score_hits
from packages.shared.types import RuleHit


def _hits(n: int) -> list[RuleHit]:
    return [RuleHit(rule_id=f"r{i}", severity="p2", detail="") for i in range(n)]


def test_default_threshold_no_p1_for_low_score():
    # 3 unknown rules (weight 1.0 each) -> base 3 * 1.15 = 3.45, below 7.5 default
    res = score_hits(_hits(3))
    assert res.severity == "p2"


def test_lower_threshold_escalates_to_p1():
    res = score_hits(_hits(3), p1_min_score=3.0)
    assert res.severity == "p1"


def test_p1_needs_three_rules_even_with_low_threshold():
    res = score_hits(_hits(2), p1_min_score=0.0)
    assert res.severity == "p2"  # only 2 rules, P1 requires >= 3
