from concurrent.futures import ThreadPoolExecutor, TimeoutError
from threading import Event
from uuid import uuid4

import pytest
from alembic import command
from pydantic import ValidationError
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain import Metric, ScenarioStatus
from app.models import Dataset, Decision, District, DistrictResult, Evaluation, Initiative, InitiativeRule
from app.schemas import DecisionSelect, DistrictResultRead, EvaluationRead, Indicators, ScenarioCreate
from app.seed import seed
from app.services.scenarios import ScenarioError, create_scenario, replace_decisions, submit_scenario, validate_plan
from app.services.scoring import calculate
from conftest import migration_config


def new_scenario(session):
    return create_scenario(session, ScenarioCreate(dataset_id=session.scalar(select(Dataset.id)), team_name="Team A"))


def choices(session, pairs):
    catalog = {item.code: item for item in session.scalars(select(Initiative))}
    districts = {item.code: item.id for item in session.scalars(select(District))}
    return [DecisionSelect(initiative_id=catalog[code].id, district_id=districts[district] if district else None)
            for code, district in pairs]


EXAMPLE = [("M7", "nura"), ("M8", "nura"), ("M10", "nura"), ("M12", None), ("M5", "saryarka")]
CHEAP = [("M9", "nura"), ("M11", "nura"), ("M10", "nura"), ("M12", None), ("M4", "saryarka")]


def test_migration_round_trip(engine):
    with engine.begin() as connection:
        command.check(migration_config(connection))
        command.downgrade(migration_config(connection), "base")
        assert inspect(connection).get_table_names() == ["alembic_version"]
        command.upgrade(migration_config(connection), "head")
        assert "initiative_rules" in inspect(connection).get_table_names()


def test_seed_and_shared_budget(session):
    dataset = seed(session)
    assert seed(session).id == dataset.id
    for model, count in [(District, 5), (Initiative, 14), (InitiativeRule, 6)]:
        assert session.scalar(select(func.count()).select_from(model)) == count
    assert new_scenario(session).dataset_id == new_scenario(session).dataset_id == dataset.id
    assert dataset.initial_budget == 100


@pytest.mark.parametrize("pairs,reason", [
    ([("M3", "nura"), ("M5", "saryarka"), ("M7", "nura"), ("M10", "nura"), ("M14", None)], "Budget exceeded"),
    ([("M7", "nura"), ("M8", "nura"), ("M9", "nura")], "At most two"),
    ([("M10", "nura"), ("M10", "saryarka")], "Repeated"),
    ([("M1", "nura"), ("M3", "saryarka")], "Incompatible"),
    ([("M4", "nura"), ("M7", "nura")], "Incompatible"),
    ([("M5", "nura"), ("M13", "nura")], "Incompatible"),
    ([("M1", None)], "requires a district"),
    ([("M2", "nura")], "must not specify a district"),
])
def test_invalid_replacement_leaves_existing_plan_unchanged(session, pairs, reason):
    scenario = new_scenario(session)
    original = replace_decisions(session, scenario.id, choices(session, CHEAP))
    with pytest.raises(ScenarioError, match=reason):
        replace_decisions(session, scenario.id, choices(session, pairs))
    assert set(session.scalars(select(Decision.id))) == {item.id for item in original}


def test_district_conflicts_do_not_apply_to_different_districts(session):
    dataset_id = session.scalar(select(Dataset.id))
    validate_plan(session, dataset_id, choices(session, [("M4", "nura"), ("M7", "esil")]))
    validate_plan(session, dataset_id, choices(session, [("M5", "nura"), ("M13", "esil")]))


def test_submission_requires_five_and_freezes_plan(session):
    scenario = new_scenario(session)
    with pytest.raises(ScenarioError, match="Exactly five"):
        submit_scenario(session, scenario.id)
    with pytest.raises(ScenarioError, match="Exactly five"):
        replace_decisions(session, scenario.id, choices(session, CHEAP + [("M2", None)]))
    replace_decisions(session, scenario.id, choices(session, EXAMPLE))
    assert submit_scenario(session, scenario.id).status == ScenarioStatus.SUBMITTED
    with pytest.raises(ScenarioError, match="Only draft"):
        replace_decisions(session, scenario.id, [])


def test_database_rejects_duplicates_and_foreign_dataset(session):
    scenario = new_scenario(session)
    row = replace_decisions(session, scenario.id, choices(session, CHEAP[:1]))[0]
    with pytest.raises(IntegrityError), session.begin_nested():
        session.add(Decision(scenario_id=scenario.id, dataset_id=scenario.dataset_id,
                             initiative_id=row.initiative_id, district_id=row.district_id))
        session.flush()
    other = Dataset(version="other", name="Other", description="", initial_budget=100,
                    horizon_quarters=8, scoring_version="astana-qol-v1", metric_weights={})
    session.add(other)
    session.flush()
    foreign = create_scenario(session, ScenarioCreate(dataset_id=other.id, team_name="B"))
    with pytest.raises(ScenarioError, match="scenario dataset"):
        replace_decisions(session, foreign.id, choices(session, CHEAP[:1]))
    with pytest.raises(IntegrityError), session.begin_nested():
        session.add(Decision(scenario_id=foreign.id, dataset_id=other.id,
                             initiative_id=row.initiative_id, district_id=row.district_id))
        session.flush()


def test_reference_scores_and_order_independence(session):
    dataset_id = session.scalar(select(Dataset.id))
    baseline = calculate(session, dataset_id, [], baseline=True)
    result = calculate(session, dataset_id, choices(session, EXAMPLE))
    assert baseline.score == pytest.approx(52.55768)
    assert baseline.critical_count == 2
    assert result.score == pytest.approx(56.54307)
    assert result.critical_count == 0
    assert calculate(session, dataset_id, list(reversed(choices(session, EXAMPLE)))).score == pytest.approx(result.score)
    assert calculate(session, dataset_id, choices(session, CHEAP)).score != pytest.approx(result.score)
    nura = session.scalar(select(District.id).where(District.code == "nura"))
    assert result.indicators[nura]["b1"] == 55 + 12 * 7 / 8 + 2  # Fixed synergy is not lag-scaled.
    assert sum(item.cost for _, item in validate_plan(session, dataset_id, choices(session, EXAMPLE))) == 95
    assert sum(item.cost for _, item in validate_plan(session, dataset_id, choices(session, CHEAP))) == 61


@pytest.mark.parametrize("score", [-1, 101, float("nan"), float("inf")])
def test_indicator_contract(score):
    with pytest.raises(ValidationError):
        Indicators(**({m.value: 50 for m in Metric} | {"t1": score}))


def test_clients_cannot_override_budget_or_cost():
    with pytest.raises(ValidationError):
        DecisionSelect(initiative_id=uuid4(), cost=0)
    with pytest.raises(ValidationError):
        ScenarioCreate(dataset_id=uuid4(), team_name="A", initial_budget=999)
    with pytest.raises(ValidationError):
        ScenarioCreate(dataset_id=uuid4(), team_name="  ")


def test_evaluation_serialization_includes_ten_indicators(session):
    scenario = new_scenario(session)
    replace_decisions(session, scenario.id, choices(session, EXAMPLE))
    submit_scenario(session, scenario.id)
    baseline = calculate(session, scenario.dataset_id, [], baseline=True)
    result = calculate(session, scenario.dataset_id, choices(session, EXAMPLE))
    report = Evaluation(scenario_id=scenario.id, dataset_id=scenario.dataset_id,
                        baseline_score=baseline.score, final_score=result.score,
                        scoring_version="astana-qol-v1", ai_model="test", prompt_version="test-v1",
                        summary="Example explanation", strengths=["Access"], risks=["Tradeoffs"],
                        consequences=[], recommendations=[])
    session.add(report)
    session.flush()
    for district_id, indicators in result.indicators.items():
        session.add(DistrictResult(evaluation_id=report.id, dataset_id=scenario.dataset_id,
                                  district_id=district_id, **indicators))
    session.flush()
    session.expire_all()
    payload = EvaluationRead.model_validate({
        **{field: getattr(report, field) for field in EvaluationRead.model_fields if field != "districts"},
        "districts": [DistrictResultRead.model_validate(row) for row in session.scalars(select(DistrictResult))],
    }).model_dump(mode="json")
    assert len(payload["districts"]) == 5
    assert set(Metric).issubset(payload["districts"][0])
    assert isinstance(payload["id"], str)


def test_concurrent_submission_prevents_late_edit(engine):
    if engine.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    with Session(engine) as setup, setup.begin():
        seed(setup)
        scenario = new_scenario(setup)
        scenario_id = scenario.id
        replace_decisions(setup, scenario_id, choices(setup, EXAMPLE))
    started = Event()

    def competing_edit():
        with Session(engine) as second, second.begin():
            started.set()
            replace_decisions(second, scenario_id, [])

    with ThreadPoolExecutor(max_workers=1) as pool:
        with Session(engine) as first, first.begin():
            submit_scenario(first, scenario_id)
            future = pool.submit(competing_edit)
            assert started.wait(timeout=5)
            with pytest.raises(TimeoutError):
                future.result(timeout=0.3)
        with pytest.raises(ScenarioError, match="Only draft"):
            future.result(timeout=5)
