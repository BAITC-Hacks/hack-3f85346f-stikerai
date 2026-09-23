"""Wire contracts; metrics use lowercase datadoc.md codes (T1 -> t1)."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain import Direction, InitiativeScope, MAX_BUDGET, Metric, RuleKind, RuleScope, ScenarioStatus

Indicator = Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]
Delta = Annotated[float, Field(ge=-100, le=100, allow_inf_nan=False)]
CityScore = Annotated[float, Field(le=100, allow_inf_nan=False)]
Money = Annotated[int, Field(ge=0, le=MAX_BUDGET, strict=True)]


class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid", str_strip_whitespace=True)


class Indicators(Contract):
    t1: Indicator
    t2: Indicator
    e1: Indicator
    e2: Indicator
    s1: Indicator
    s2: Indicator
    b1: Indicator
    b2: Indicator
    c1: Indicator
    c2: Indicator


class Impact(Contract):
    t1: Delta
    t2: Delta
    e1: Delta
    e2: Delta
    s1: Delta
    s2: Delta
    b1: Delta
    b2: Delta
    c1: Delta
    c2: Delta


class DatasetRead(Contract):
    id: UUID
    version: str
    name: str
    description: str
    initial_budget: Money
    horizon_quarters: int
    scoring_version: str
    metric_weights: dict[Metric, float]
    created_at: datetime


class DistrictRead(Indicators):
    id: UUID
    dataset_id: UUID
    code: str
    name: str
    population_share: Annotated[float, Field(gt=0, le=1)]
    created_at: datetime


class InitiativeRead(Impact):
    id: UUID
    dataset_id: UUID
    code: str
    direction: Direction
    scope: InitiativeScope
    title: str
    cost: Money
    lag_quarters: Annotated[int, Field(ge=0)]
    created_at: datetime


class DatasetCurrentRead(Contract):
    dataset: DatasetRead
    districts: list[DistrictRead]
    initiatives: list[InitiativeRead]
    baseline_score: CityScore


class InitiativeRuleRead(Contract):
    id: UUID
    dataset_id: UUID
    first_id: UUID
    second_id: UUID
    kind: RuleKind
    scope: RuleScope
    metric: Metric | None
    delta: Delta | None
    created_at: datetime


class ScenarioCreate(Contract):
    dataset_id: UUID
    team_name: Annotated[str, Field(min_length=1, max_length=120)]


class DecisionSelect(Contract):
    initiative_id: UUID
    district_id: UUID | None = None


class DecisionsReplace(Contract):
    decisions: Annotated[list[DecisionSelect], Field(max_length=5)]


class DecisionRead(Contract):
    id: UUID
    scenario_id: UUID
    dataset_id: UUID
    initiative_id: UUID
    district_id: UUID | None
    created_at: datetime


class ScenarioRead(Contract):
    id: UUID
    dataset_id: UUID
    team_name: str
    status: ScenarioStatus
    created_at: datetime
    submitted_at: datetime | None
    initial_budget: Money
    spent_budget: Money
    remaining_budget: Money
    decisions: list[DecisionRead]
    revision: int


class DistrictResultRead(Indicators):
    evaluation_id: UUID
    district_id: UUID
    dataset_id: UUID


class EvaluationRead(Contract):
    id: UUID
    scenario_id: UUID
    dataset_id: UUID
    baseline_score: CityScore
    final_score: CityScore
    scoring_version: str
    ai_model: str
    prompt_version: str
    summary: str
    strengths: list[str]
    risks: list[str]
    consequences: list[str]
    recommendations: list[str]
    created_at: datetime
    districts: list[DistrictResultRead]


class ScenarioStart(ScenarioCreate):
    request_id: UUID


class RevisionRequest(Contract):
    expected_revision: Annotated[int, Field(ge=0)]


class PlanSave(DecisionsReplace, RevisionRequest):
    pass


class CopyRequest(Contract):
    request_id: UUID


class DistrictProjection(Contract):
    district_id: UUID
    name: str
    before: Indicators
    after: Indicators
    baseline_score: Indicator
    final_score: Indicator


class AppliedEffect(Contract):
    label: str
    district_id: UUID
    # Unclamped additive points, not an independently attributable Score change.
    effects: dict[Metric, float]


class CalculationRead(Contract):
    scoring_version: str
    baseline_score: CityScore
    final_score: CityScore
    baseline_critical_count: int
    critical_count: int
    average: float
    weakest: float
    spent_budget: Money
    districts: list[DistrictProjection]
    contributions: list[AppliedEffect]


class ExplanationText(Contract):
    summary: str
    strengths: list[str]
    risks: list[str]
    consequences: list[str]
    recommendations: list[str]


class ExplanationRead(Contract):
    status: Literal["pending", "running", "completed", "failed"]
    payload: ExplanationText | None
    error: str | None


class CatalogRead(Contract):
    dataset: DatasetRead
    districts: list[DistrictRead]
    initiatives: list[InitiativeRead]
    rules: list[InitiativeRuleRead]
    baseline: CalculationRead


class DistrictPreviewRead(Contract):
    district_id: UUID
    district_code: str
    district_name: str
    population_share: float
    baseline_score: CityScore
    projected_score: CityScore
    score_delta: float
    baseline_indicators: Indicators
    projected_indicators: Indicators


class ScenarioPreviewRead(Contract):
    current_cost: Money
    remaining_budget: Money
    baseline_score: CityScore
    projected_score: CityScore
    score_delta: float
    districts: list[DistrictPreviewRead]


class CivicSupport(Contract):
    code: Annotated[str, Field(pattern=r"^M([1-9]|1[0-4])$")]
    support: Indicator


class CivicDistrictSignal(Contract):
    district: Literal['esil', 'almaty', 'saryarka', 'baikonur', 'nura']
    priority: Direction
    signals: Annotated[int, Field(ge=0, le=10000000, strict=True)]
    satisfaction: Indicator
    petition_signatures: Annotated[int, Field(ge=0, le=10000000, strict=True)]


class CivicContext(Contract):
    """Bounded fictional advisory snapshot; never an input to calculation or validation."""
    source: Literal['fictional_local_demo']
    alignment: Indicator
    community_funding: Money
    selected_support: Annotated[list[CivicSupport], Field(max_length=5)]
    districts: Annotated[list[CivicDistrictSignal], Field(max_length=5)]
