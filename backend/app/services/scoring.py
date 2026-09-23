"""Deterministic reference calculation for datadoc.md; AI only explains numbers."""
from dataclasses import dataclass
from math import isclose
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import InitiativeScope, Metric, RuleKind
from app.models import Dataset, District, InitiativeRule
from app.schemas import DecisionSelect
from app.services.scenarios import ScenarioError, validate_plan


@dataclass(frozen=True)
class ScoreBreakdown:
    score: float
    average: float
    weakest: float
    critical_count: int
    district_scores: dict[UUID, float]
    indicators: dict[UUID, dict[str, float]]


def calculate(session: Session, dataset_id: UUID, choices: list[DecisionSelect], *, baseline: bool = False) -> ScoreBreakdown:
    if baseline and choices:
        raise ScenarioError("Baseline calculation cannot include decisions")
    selected = validate_plan(session, dataset_id, choices, complete=not baseline)
    dataset = session.get(Dataset, dataset_id)
    if dataset.scoring_version != "astana-qol-v1":
        raise ScenarioError("Unsupported scoring version")
    districts = list(session.scalars(select(District).where(District.dataset_id == dataset_id)))
    if not districts or not isclose(sum(d.population_share for d in districts), 1):
        raise ScenarioError("Dataset population shares must sum to one")
    weights = dataset.metric_weights
    if set(weights) != set(Metric) or not isclose(sum(weights.values()), 1) or any(w < 0 for w in weights.values()):
        raise ScenarioError("Invalid metric weights")
    values = {d.id: {m.value: getattr(d, m.value) for m in Metric} for d in districts}
    for choice, item in selected:
        if not 0 <= item.lag_quarters <= dataset.horizon_quarters:
            raise ScenarioError("Invalid initiative lag")
        factor = (dataset.horizon_quarters - item.lag_quarters) / dataset.horizon_quarters
        targets = values if item.scope == InitiativeScope.CITY else [choice.district_id]
        for target in targets:
            for metric in Metric:
                values[target][metric.value] += getattr(item, metric.value) * factor
    chosen = {choice.initiative_id: choice for choice, _ in selected}
    for rule in session.scalars(select(InitiativeRule).where(
        InitiativeRule.dataset_id == dataset_id, InitiativeRule.kind == RuleKind.SYNERGY,
    )):
        if rule.first_id in chosen and rule.second_id in chosen:
            target = chosen[rule.first_id].district_id
            if target is None:
                raise ScenarioError("Invalid first-district synergy")
            values[target][rule.metric.value] += rule.delta
    # Clamp once after summing all effects and fixed (unscaled) synergies.
    values = {key: {metric: min(100.0, max(0.0, value)) for metric, value in row.items()}
              for key, row in values.items()}
    district_scores = {key: sum(weights[m] * value for m, value in row.items()) for key, row in values.items()}
    average = sum(d.population_share * district_scores[d.id] for d in districts)
    weakest = min(district_scores.values())
    critical = sum(value < 40 for row in values.values() for value in row.values())
    return ScoreBreakdown(0.7 * average + 0.3 * weakest - critical,
                          average, weakest, critical, district_scores, values)
