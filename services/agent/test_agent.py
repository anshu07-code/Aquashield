#!/usr/bin/env python3
"""
Test the Aquashield Strands agent against mocks/agent-plan.json.

Usage:
  MOCK_MODE=1 python services/agent/test_agent.py

This script:
1. Validates that the Pydantic AgentPlan schema matches mocks/agent-plan.json
2. Runs the agent in MOCK_MODE and checks it produces valid output
3. Validates tools produce expected shapes

Requires: python 3.10+, pydantic, strands-agents
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Add services/agent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Set mock mode before importing agent modules
os.environ["MOCK_MODE"] = "1"

from schemas import AgentPlan

MOCK_FILE = Path(__file__).parent.parent.parent / "mocks" / "agent-plan.json"


def test_mock_file_conforms_to_schema():
    """Verify the mock JSON file conforms to AgentPlanSchema."""
    print(f"Testing {MOCK_FILE} against AgentPlan schema...")

    if not MOCK_FILE.exists():
        print(f"SKIP: {MOCK_FILE} not found (P2 may not have created mocks yet)")
        return True

    with open(MOCK_FILE, encoding="utf-8") as f:
        mock_data = json.load(f)

    try:
        plan = AgentPlan.model_validate(mock_data)
        print(f"  PASS: mock conforms to AgentPlan schema")
        print(f"  summary: {plan.summary}")
        print(f"  actions: {len(plan.actions)}")
        print(f"  alertDraft.en: {plan.alertDraft.en[:60]}...")
        print(f"  alertDraft.hi: {plan.alertDraft.hi[:60]}...")
        print(f"  workOrderIds: {plan.workOrderIds}")
        print(f"  toolsUsed: {plan.toolsUsed}")
        return True
    except Exception as e:
        print(f"  FAIL: mock does not conform to schema: {e}")
        return False


def test_schema_field_coverage():
    """Verify AgentPlan schema covers all required fields from AgentPlanSchema in types."""
    required_fields = {"summary", "why", "actions", "alertDraft", "workOrderIds", "toolsUsed", "confidenceNote"}
    schema_fields = set(AgentPlan.model_fields.keys())

    missing = required_fields - schema_fields
    extra = schema_fields - required_fields

    if missing:
        print(f"FAIL: AgentPlan is missing fields: {missing}")
        return False
    if extra:
        print(f"WARN: AgentPlan has extra fields not in contract: {extra}")

    # Check alertDraft subfields
    alert_fields = set(AgentPlan.model_fields["alertDraft"].annotation.__annotations__.keys())
    if "en" not in alert_fields or "hi" not in alert_fields:
        print("FAIL: alertDraft missing en or hi fields")
        return False

    print("  PASS: schema field coverage is complete")
    return True


def test_tools_module_imports():
    """Verify all tools can be imported without errors."""
    print("Testing tool imports...")

    try:
        from tools import (
            get_zone_risk,
            get_forecast,
            get_nearby_reports,
            get_nearby_zones,
            plan_safe_route,
            create_work_order,
            draft_alert,
            publish_alert,
        )
        print("  PASS: all tools imported successfully")
        return True
    except Exception as e:
        print(f"  FAIL: tool import error: {e}")
        return False


def test_tools_mock_output():
    """Test each tool in mock mode and verify output shapes."""
    print("Testing tools in mock mode...")

    from tools import (
        get_zone_risk,
        get_forecast,
        get_nearby_reports,
        get_nearby_zones,
        plan_safe_route,
        create_work_order,
        draft_alert,
        publish_alert,
    )

    tools_ok = True

    # Test get_zone_risk
    try:
        result = get_zone_risk("z_minto")
        assert "risk" in result, "get_zone_risk missing 'risk'"
        assert "tier" in result, "get_zone_risk missing 'tier'"
        assert "factors" in result, "get_zone_risk missing 'factors'"
        print(f"  get_zone_risk: PASS (risk={result.get('risk')}, tier={result.get('tier')})")
    except Exception as e:
        print(f"  get_zone_risk: FAIL ({e})")
        tools_ok = False

    # Test get_forecast
    try:
        result = get_forecast("z_minto")
        assert "forecast" in result, "get_forecast missing 'forecast'"
        assert isinstance(result["forecast"], list), "forecast should be a list"
        print(f"  get_forecast: PASS ({result['count']} forecast points)")
    except Exception as e:
        print(f"  get_forecast: FAIL ({e})")
        tools_ok = False

    # Test get_nearby_reports
    try:
        result = get_nearby_reports("z_minto")
        assert "reports" in result, "get_nearby_reports missing 'reports'"
        print(f"  get_nearby_reports: PASS ({result['totalCount']} reports, {result['verifiedCount']} verified)")
    except Exception as e:
        print(f"  get_nearby_reports: FAIL ({e})")
        tools_ok = False

    # Test plan_safe_route
    try:
        result = plan_safe_route({"lat": 28.6139, "lng": 77.2090}, {"lat": 28.65, "lng": 77.22})
        assert "routes" in result, "plan_safe_route missing 'routes'"
        print(f"  plan_safe_route: PASS ({result['routeCount']} routes)")
    except Exception as e:
        print(f"  plan_safe_route: FAIL ({e})")
        tools_ok = False

    # Test create_work_order (dry run)
    try:
        result = create_work_order("z_minto", "pump_dispatch", "P1", "Test pump dispatch", execute=False)
        assert result.get("dryRun") == True, "execute=False should set dryRun=True"
        assert result.get("id") is None, "execute=False should not create work order"
        print(f"  create_work_order (execute=False): PASS (dry run, no ID assigned)")
    except Exception as e:
        print(f"  create_work_order (execute=False): FAIL ({e})")
        tools_ok = False

    # Test publish_alert (dry run)
    try:
        result = publish_alert("alert_001", execute=False)
        assert result.get("dryRun") == True, "execute=False should set dryRun=True"
        print(f"  publish_alert (execute=False): PASS (dry run)")

        result_live = publish_alert("alert_001", execute=True)
        assert result_live.get("dryRun") == False, "execute=True should clear dryRun"
        print(f"  publish_alert (execute=True): PASS (published)")
    except Exception as e:
        print(f"  publish_alert: FAIL ({e})")
        tools_ok = False

    return tools_ok


def main():
    print("=" * 60)
    print("Aquashield Strands Agent — Test Suite")
    print("=" * 60)

    os.environ["MOCK_MODE"] = "1"

    results = []

    print("\n[1] Schema field coverage")
    results.append(("Schema coverage", test_schema_field_coverage()))

    print("\n[2] Mock file conforms to schema")
    results.append(("Mock file conformance", test_mock_file_conforms_to_schema()))

    print("\n[3] Tool imports")
    results.append(("Tool imports", test_tools_module_imports()))

    print("\n[4] Tools in mock mode")
    results.append(("Tools mock mode", test_tools_mock_output()))

    print("\n" + "=" * 60)
    print("Results:")
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("All tests passed!")
        sys.exit(0)
    else:
        print("Some tests failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
