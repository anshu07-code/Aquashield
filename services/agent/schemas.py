"""
Pydantic schemas mirroring the TypeScript AgentPlanSchema.

Source of truth: packages/types/src/index.ts — AgentPlanSchema
Update these if the TypeScript contract changes.

All schemas here must pass validation against mocks/agent-plan.json.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    PUMP_DISPATCH = "pump_dispatch"
    DRAIN_CLEANING = "drain_cleaning"
    BARRICADE = "barricade"
    TRAFFIC_DIVERSION = "traffic_diversion"
    PUBLIC_ALERT = "public_alert"
    MONITOR = "monitor"


class Priority(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class Action(BaseModel):
    type: ActionType
    priority: Priority
    reason: str


class AlertDraft(BaseModel):
    en: Annotated[str, Field(max_length=160)]
    hi: Annotated[str, Field(max_length=160)]


class AgentPlan(BaseModel):
    """
    Structured output from the Strands agent.
    Mirrors AgentPlanSchema from packages/types/src/index.ts.
    """

    summary: str = Field(
        description="One-sentence summary of the current situation at the zone."
    )
    why: list[str] = Field(
        description="List of specific reasons for the risk assessment. All facts come from tool calls."
    )
    actions: list[Action] = Field(
        description="Ranked list of recommended actions for city ops."
    )
    alertDraft: AlertDraft = Field(
        description="Bilingual alert draft — English and Hindi, each under 160 characters."
    )
    workOrderIds: list[str] = Field(
        description="IDs of work orders created. Empty if execute=False or if no work orders were created."
    )
    toolsUsed: list[str] = Field(
        description="List of tool names that were called to produce this plan."
    )
    confidenceNote: str = Field(
        description="Brief note on data freshness and confidence. e.g. 'Based on forecast at 14:00 UTC and 3 verified reports.'"
    )

    model_config = {
        "extra": "forbid",
    }


class AgentAskRequest(BaseModel):
    """
    Incoming request to the agent.
    Mirrors AgentAskRequestSchema from packages/types/src/index.ts.
    """

    zone_id: str | None = Field(default=None, description="Zone ID to ask about.")
    question: Annotated[str, Field(max_length=500)] = Field(
        description="Natural language question from the ops user."
    )
    lang: str = Field(default="en", description="Language: 'en' or 'hi'.")
    # execute flag: when False, agent returns a plan only (no side effects).
    # When True, agent may create work orders and alert drafts.
    execute: bool = Field(default=False)
