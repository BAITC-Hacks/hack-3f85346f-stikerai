from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import InitiativeScope, Metric, RuleKind
from app.models import Dataset, District, InitiativeRule
from app.schemas import AppliedEffect, CalculationRead, DecisionSelect, DistrictProjection
from app.services.scenarios import validate_plan
from app.services.scoring import calculate


def build_result(session: Session, dataset: Dataset, choices: list[DecisionSelect], *, baseline=False) -> CalculationRead:
    before = calculate(session, dataset.id, [], baseline=True)
    after = before if baseline else calculate(session, dataset.id, choices)
    districts = list(session.scalars(select(District).where(District.dataset_id == dataset.id).order_by(District.code)))
    selected = validate_plan(session, dataset.id, choices, complete=not baseline)
    contributions = []
    for choice, item in selected:
        factor = (dataset.horizon_quarters - item.lag_quarters) / dataset.horizon_quarters
        targets = [d.id for d in districts] if item.scope == InitiativeScope.CITY else [choice.district_id]
        for target in targets:
            contributions.append(AppliedEffect(label=f"{item.code} · {item.title}", district_id=target,
                effects={m.value: getattr(item, m.value) * factor for m in Metric if getattr(item, m.value)}))
    chosen = {choice.initiative_id: choice for choice, _ in selected}
    for rule in session.scalars(select(InitiativeRule).where(InitiativeRule.dataset_id == dataset.id, InitiativeRule.kind == RuleKind.SYNERGY)):
        if rule.first_id in chosen and rule.second_id in chosen:
            contributions.append(AppliedEffect(label="Синергия", district_id=chosen[rule.first_id].district_id,
                                               effects={rule.metric.value: rule.delta}))
    return CalculationRead(scoring_version=dataset.scoring_version, baseline_score=before.score,
        final_score=after.score, baseline_critical_count=before.critical_count, critical_count=after.critical_count,
        average=after.average, weakest=after.weakest, spent_budget=sum(item.cost for _, item in selected),
        districts=[DistrictProjection(district_id=d.id, name=d.name, before=before.indicators[d.id],
            after=after.indicators[d.id], baseline_score=before.district_scores[d.id], final_score=after.district_scores[d.id]) for d in districts],
        contributions=contributions)
