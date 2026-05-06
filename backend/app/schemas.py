from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Action = Literal["review", "reject", "approve"]
Operator = Literal["==", "!=", ">", ">=", "<", "<=", "in", "not_in"]


class Variable(BaseModel):
    name: str
    label: str
    type: Literal["number", "boolean", "string"]
    description: str
    allowed_operators: list[Operator]


class Condition(BaseModel):
    field: str
    operator: Operator
    value: Any


class ConditionsGroup(BaseModel):
    all: list[Condition] = Field(min_length=1)


class RuleBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = ""
    action: Action
    conditions: ConditionsGroup


class RuleCreate(RuleBase):
    pass


class RuleUpdate(RuleBase):
    status: Literal["active", "draft", "disabled"] = "active"


class SimulationMetrics(BaseModel):
    total_transactions: int
    matched_transactions: int
    matched_transactions_pct: float
    total_fraud_transactions: int
    captured_fraud_transactions: int
    captured_fraud_transactions_pct: float
    total_amount: float
    matched_amount: float
    total_fraud_amount: float
    captured_fraud_amount: float
    captured_fraud_amount_pct: float
    fraud_rate_inside_rule: float
    fraud_rate_global: float
    lift: float


class RuleOut(RuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_simulation: SimulationMetrics | None = None


class SimulationRequest(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    query_text: str | None = None


class SimulationResponse(BaseModel):
    metrics: SimulationMetrics
    warnings: list[str]


class SimulationRunOut(SimulationResponse):
    id: str
    rule_id: str
    mode: Literal["date_range", "query"]
    created_at: datetime
    start_date: date | None = None
    end_date: date | None = None
    query_text: str | None = None


class AiSuggestionRequest(BaseModel):
    message: str = Field(min_length=1)


class AiSuggestionResponse(BaseModel):
    proposed_rule: RuleCreate
    explanation: str
    warnings: list[str]


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1)
    context: Literal["rules", "alerts", "analytics"]
    dataset_summary: str | None = None


class AssistantChatResponse(BaseModel):
    answer: str
    insights: list[str]
    model: str
    python_code: str | None = None


class CreatePrResponse(BaseModel):
    pr_url: str
    yaml_content: str
    title: str
    branch: str
