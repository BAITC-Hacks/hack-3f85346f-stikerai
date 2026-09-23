"""Scenario writes require `with session.begin():`; this module never commits."""
from collections import Counter
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.domain import InitiativeScope, MAX_PER_DIRECTION, REQUIRED_DECISIONS, RuleKind, RuleScope, ScenarioStatus
from app.models import Dataset, Decision, District, Initiative, InitiativeRule, Scenario
from app.schemas import DecisionSelect, ScenarioCreate


class ScenarioError(ValueError):
    pass


def validate_plan(session: Session, dataset_id: UUID, choices: list[DecisionSelect], *, complete: bool = False):
    dataset = session.get(Dataset, dataset_id)
    if dataset is None:
        raise ScenarioError("Dataset not found")
    if len(choices) > REQUIRED_DECISIONS or (complete and len(choices) != REQUIRED_DECISIONS):
        raise ScenarioError("Exactly five decisions are required for submission")
    if len({choice.initiative_id for choice in choices}) != len(choices):
        raise ScenarioError("Repeated initiatives are not allowed")
    selected = []
    for choice in choices:
        item = session.get(Initiative, choice.initiative_id)
        if item is None or item.dataset_id != dataset_id:
            raise ScenarioError("Initiative must belong to the scenario dataset")
        if item.scope == InitiativeScope.CITY:
            if choice.district_id is not None:
                raise ScenarioError("City initiatives must not specify a district")
        else:
            district = session.get(District, choice.district_id) if choice.district_id else None
            if district is None or district.dataset_id != dataset_id:
                raise ScenarioError("District initiative requires a district from the same dataset")
        selected.append((choice, item))
    if any(count > MAX_PER_DIRECTION for count in Counter(item.direction for _, item in selected).values()):
        raise ScenarioError("At most two initiatives per direction are allowed")
    if sum(item.cost for _, item in selected) > dataset.initial_budget:
        raise ScenarioError("Budget exceeded")
    chosen = {choice.initiative_id: choice for choice in choices}
    conflicts = session.scalars(select(InitiativeRule).where(
        InitiativeRule.dataset_id == dataset_id, InitiativeRule.kind == RuleKind.CONFLICT,
    ))
    for rule in conflicts:
        if rule.first_id in chosen and rule.second_id in chosen:
            if rule.scope == RuleScope.GLOBAL or chosen[rule.first_id].district_id == chosen[rule.second_id].district_id:
                raise ScenarioError("Incompatible initiatives in the selected scope")
    return selected


def create_scenario(session: Session, request: ScenarioCreate) -> Scenario:
    if session.get(Dataset, request.dataset_id) is None:
        raise ScenarioError("Dataset not found")
    scenario = Scenario(dataset_id=request.dataset_id, team_name=request.team_name)
    session.add(scenario)
    session.flush()
    return scenario


def _lock_draft(session: Session, scenario_id: UUID) -> Scenario:
    scenario = session.scalar(select(Scenario).where(Scenario.id == scenario_id)
                              .with_for_update().execution_options(populate_existing=True))
    if scenario is None:
        raise ScenarioError("Scenario not found")
    if scenario.status != ScenarioStatus.DRAFT:
        raise ScenarioError("Only draft scenarios can be edited or submitted")
    return scenario


def replace_decisions(session: Session, scenario_id: UUID, choices: list[DecisionSelect]) -> list[Decision]:
    scenario = _lock_draft(session, scenario_id)
    validate_plan(session, scenario.dataset_id, choices)
    # Replace the whole unordered plan atomically; invalid input leaves it unchanged.
    session.execute(delete(Decision).where(Decision.scenario_id == scenario.id))
    rows = [Decision(scenario_id=scenario.id, dataset_id=scenario.dataset_id,
                     initiative_id=choice.initiative_id, district_id=choice.district_id) for choice in choices]
    session.add_all(rows)
    session.flush()
    return rows


def submit_scenario(session: Session, scenario_id: UUID) -> Scenario:
    scenario = _lock_draft(session, scenario_id)
    choices = [DecisionSelect(initiative_id=row.initiative_id, district_id=row.district_id)
               for row in session.scalars(select(Decision).where(Decision.scenario_id == scenario.id))]
    validate_plan(session, scenario.dataset_id, choices, complete=True)
    scenario.status = ScenarioStatus.SUBMITTED
    scenario.submitted_at = datetime.now(timezone.utc)
    session.flush()
    return scenario
