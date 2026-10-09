"""
Aquashield Strands AI Agent — AWS Lambda handler.

Handles POST /agent/ask with body: {zoneId, question, lang, execute}
Returns: AgentPlan JSON matching AgentPlanSchema

Environment variables required:
  BEDROCK_MODEL_ID  — Bedrock model ID (deployed value: amazon.nova-lite-v1:0)
  AWS_REGION         — AWS region (deployed value: ap-southeast-2)
  API_BASE_URL       — Base URL of the Aquashield API (default: http://localhost:3000)
  API_KEY            — Internal API key (optional for local dev)
  MOCK_MODE          — If "1", use mock API responses (for local dev without backend)
  OPS_PASSCODE       — Passcode for ops endpoints (work orders, alerts); sent as x-ops-passcode

The agent uses tools that call our own API — never invents facts.
execute flag: false=plan only, true=may create work orders/publish alerts.
"""

from __future__ import annotations

import json
import os
import traceback
from typing import Any

# Work both as a packaged Lambda module (relative) and run standalone (absolute).
try:  # packaged as `services.agent.app` (Chalice/SAM Python Lambda)
    from .schemas import AgentPlan, AgentAskRequest
    from .prompts import SYSTEM_PROMPT_V1, SYSTEM_PROMPT_VERSION
except ImportError:  # running as `python app.py` from services/agent/
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).parent))
    from schemas import AgentPlan, AgentAskRequest  # type: ignore
    from prompts import SYSTEM_PROMPT_V1, SYSTEM_PROMPT_VERSION  # type: ignore


# ---------------------------------------------------------------------------
# Lazy imports — Strands and Boto3 only at runtime, not at module load
# ---------------------------------------------------------------------------

_agent_instance: Any = None


def _get_agent():
    """
    Lazily create and cache the Strands agent.
    Created once per Lambda cold-start; reused for subsequent invocations.
    """
    global _agent_instance
    if _agent_instance is None:
        from strands import Agent
        from strands_tools import lambda_tool

        try:  # packaged as a module
            from .tools import (
                get_zone_risk,
                get_forecast,
                get_nearby_reports,
                get_nearby_zones,
                plan_safe_route,
                create_work_order,
                draft_alert,
                publish_alert,
            )
        except ImportError:  # running standalone
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

        # Wrap tools with the Strands @tool decorator
        # Note: Actual tool registration depends on Strands SDK version
        # Using the standard Strands pattern here
        tools = [
            get_zone_risk,
            get_forecast,
            get_nearby_reports,
            get_nearby_zones,
            plan_safe_route,
            create_work_order,
            draft_alert,
            publish_alert,
        ]

        _agent_instance = Agent(
            model=os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0"),
            system_prompt=SYSTEM_PROMPT_V1,
            tools=tools,
        )
    return _agent_instance


# ---------------------------------------------------------------------------
# Lambda entry point
# ---------------------------------------------------------------------------

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Lambda entry point. Handles API Gateway proxy events.

    Expected event body:
    {
        "zoneId": "z_minto",
        "question": "Why is this zone dangerous and what should we do?",
        "lang": "en",
        "execute": false
    }
    """
    # CORS headers for API Gateway
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,x-ops-passcode",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }

    # Handle CORS preflight
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS" or event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    try:
        # Parse and validate request
        body = _parse_body(event)
        request = _validate_request(body)

        # Build the prompt including the execute flag context
        prompt = _build_prompt(request)

        # Run the agent
        raw_output = _run_agent(prompt, request.execute)

        # Parse and validate output
        plan = _parse_plan(raw_output)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(plan, ensure_ascii=False),
        }

    except ValueError as e:
        # Validation errors — 400 Bad Request
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": {"code": "VALIDATION_ERROR", "message": str(e)}}),
        }
    except PermissionError as e:
        # Auth errors — 401 Unauthorized
        return {
            "statusCode": 401,
            "headers": headers,
            "body": json.dumps({"error": {"code": "UNAUTHORIZED", "message": str(e)}}),
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": {"code": "INTERNAL", "message": str(e)}}),
        }


# ---------------------------------------------------------------------------
# Request handling
# ---------------------------------------------------------------------------

def _parse_body(event: dict[str, Any]) -> dict[str, Any]:
    """Extract and parse the JSON body from the API Gateway event."""
    if event.get("body") is None:
        raise ValueError("Request body is required")
    body = event.get("body", "")
    if isinstance(body, str):
        return json.loads(body)
    return body


def _validate_request(body: dict[str, Any]) -> AgentAskRequest:
    """Validate the incoming request against the schema."""
    try:
        return AgentAskRequest(
            zone_id=body.get("zoneId"),
            question=body.get("question", ""),
            lang=body.get("lang", "en"),
            execute=body.get("execute", False),
        )
    except Exception as e:
        raise ValueError(f"Invalid request: {e}") from e


def _build_prompt(request: AgentAskRequest) -> str:
    """Build the full prompt from the user request."""
    # The agent's system prompt already includes instructions.
    # The user question is the primary input.
    parts = []

    if request.zone_id:
        parts.append(f"[Zone ID: {request.zone_id}]")

    parts.append(f"[Language: {'Hindi' if request.lang == 'hi' else 'English'}]")

    if request.execute:
        parts.append("[EXECUTE MODE: You may create work orders and publish alerts after human confirmation.]")
    else:
        parts.append("[PLAN MODE: Return a plan only. Do not create work orders or publish alerts.]")

    parts.append(f"\nUser question: {request.question}")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Agent execution
# ---------------------------------------------------------------------------

def _run_agent(prompt: str, execute: bool) -> str:
    """
    Run the Strands agent and return the raw text output.
    Uses the Bedrock model via the Strands Agents SDK.
    """
    agent = _get_agent()

    # Inject execute flag into the prompt
    # The agent should check this in its reasoning
    full_prompt = f"{prompt}\n\n[Remember: execute={'true' if execute else 'false'} — follow the rules in your system prompt.]"

    try:
        response = agent.run(full_prompt)
        return response
    except Exception as e:
        raise RuntimeError(f"Agent run failed: {e}") from e


def _parse_plan(raw_output: str) -> dict[str, Any]:
    """
    Parse the agent's raw text output as JSON and validate against AgentPlan.
    Returns a dict ready for JSON serialization.
    """
    # Try to extract JSON from the response (in case model adds markdown)
    json_text = _extract_json(raw_output)

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Agent output is not valid JSON: {e}\nOutput: {raw_output[:500]}") from e

    try:
        plan = AgentPlan.model_validate(parsed)
        return plan.model_dump(mode="json")
    except Exception as e:
        # Last resort: return what we have with an error note
        raise ValueError(f"Agent output does not match AgentPlanSchema: {e}\nOutput: {raw_output[:500]}") from e


def _extract_json(text: str) -> str:
    """Extract JSON from text that may contain markdown code blocks."""
    text = text.strip()
    # Handle ```json ... ``` blocks
    if text.startswith("```"):
        lines = text.split("\n")
        json_lines = [l for l in lines[1:] if not l.strip().startswith("```")]
        text = "\n".join(json_lines)
    # Handle { ... } envelope
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]
    return text


# ---------------------------------------------------------------------------
# Local development entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    # Simple local test runner
    test_event = {
        "body": json.dumps({
            "zoneId": "z_minto",
            "question": "Why is Minto Bridge underpass dangerous right now?",
            "lang": "en",
            "execute": False,
        })
    }
    result = handler(test_event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    sys.exit(0 if result.get("statusCode") == 200 else 1)