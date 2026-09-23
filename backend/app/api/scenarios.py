"""HTTP workflow for the versioned dataset and deterministic scenarios."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.domain import Metric, ScenarioStatus
from app.models import (
    Dataset,
    Decision,
    District,
    DistrictResult,
    Evaluation,
    Initiative,
    Scenario,
)
from app.schemas import (
    DatasetCurrentRead,
    DatasetRead,
    DecisionSelect,
    DecisionRead,
    DecisionsReplace,
    DistrictPreviewRead,
    DistrictRead,
    DistrictResultRead,
    EvaluationRead,
    InitiativeRead,
    ScenarioCreate,
    ScenarioPreviewRead,
    ScenarioRead,
)
from app.services import scoring
from app.services.scenarios import (
    ScenarioError,
    create_scenario,
    replace_decisions,
    submit_scenario,
    validate_plan,
)

router = APIRouter(tags=["datasets", "scenarios"])


def _scenario_error(exc: ScenarioError) -> HTTPException:
    message = str(exc)
    if message in {"Scenario not found", "Dataset not found"}:
        return HTTPException(status_code=404, detail=message)
    if message.startswith("Only draft scenarios"):
        return HTTPException(status_code=409, detail=message)
    return HTTPException(status_code=422, detail=message)


def _scenario_read(session: Session, scenario: Scenario) -> ScenarioRead:
    dataset = session.get(Dataset, scenario.dataset_id)
    if dataset is None:
        raise HTTPException(status_code=409, detail="Scenario dataset is unavailable")
    decisions = list(session.scalars(
        select(Decision).where(Decision.scenario_id == scenario.id).order_by(Decision.created_at, Decision.id)
    ))
    spent = sum(
        item.cost
        for decision in decisions
        if (item := session.get(Initiative, decision.initiative_id)) is not None
    )
    return ScenarioRead(
        id=scenario.id,
        dataset_id=scenario.dataset_id,
        team_name=scenario.team_name,
        status=scenario.status,
        created_at=scenario.created_at,
        submitted_at=scenario.submitted_at,
        initial_budget=dataset.initial_budget,
        spent_budget=spent,
        remaining_budget=dataset.initial_budget - spent,
        decisions=[DecisionRead.model_validate(row) for row in decisions],
    )


def _evaluation_read(session: Session, evaluation: Evaluation) -> EvaluationRead:
    districts = list(session.scalars(
        select(DistrictResult).where(DistrictResult.evaluation_id == evaluation.id)
    ))
    return EvaluationRead(
        id=evaluation.id,
        scenario_id=evaluation.scenario_id,
        dataset_id=evaluation.dataset_id,
        baseline_score=evaluation.baseline_score,
        final_score=evaluation.final_score,
        scoring_version=evaluation.scoring_version,
        ai_model=evaluation.ai_model,
        prompt_version=evaluation.prompt_version,
        summary=evaluation.summary,
        strengths=evaluation.strengths,
        risks=evaluation.risks,
        consequences=evaluation.consequences,
        recommendations=evaluation.recommendations,
        created_at=evaluation.created_at,
        districts=[DistrictResultRead.model_validate(row) for row in districts],
    )


@router.get("/datasets/current", response_model=DatasetCurrentRead)
def get_current_dataset(session: Session = Depends(get_session)) -> DatasetCurrentRead:
    """Return the newest published dataset plus its deterministic baseline score."""
    dataset = session.scalar(select(Dataset).order_by(Dataset.created_at.desc(), Dataset.version.desc()).limit(1))
    if dataset is None:
        raise HTTPException(status_code=404, detail="No dataset is available; seed the dataset first")
    districts = list(session.scalars(
        select(District).where(District.dataset_id == dataset.id).order_by(District.code)
    ))
    initiatives = list(session.scalars(
        select(Initiative).where(Initiative.dataset_id == dataset.id).order_by(Initiative.code)
    ))
    try:
        baseline = scoring.calculate(session, dataset.id, [], baseline=True)
    except ScenarioError as exc:
        raise HTTPException(status_code=409, detail="Current dataset cannot be scored") from None
    return DatasetCurrentRead(
        dataset=DatasetRead.model_validate(dataset),
        districts=[DistrictRead.model_validate(row) for row in districts],
        initiatives=[InitiativeRead.model_validate(row) for row in initiatives],
        baseline_score=baseline.score,
    )


@router.post("/scenarios", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def post_scenario(request: ScenarioCreate, session: Session = Depends(get_session)) -> ScenarioRead:
    try:
        with session.begin():
            scenario = create_scenario(session, request)
            session.flush()
            result = _scenario_read(session, scenario)
    except ScenarioError as exc:
        raise _scenario_error(exc) from None
    return result


@router.get("/scenarios/{scenario_id}", response_model=ScenarioRead)
def get_scenario(scenario_id: UUID, session: Session = Depends(get_session)) -> ScenarioRead:
    scenario = session.get(Scenario, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _scenario_read(session, scenario)


@router.put("/scenarios/{scenario_id}/decisions", response_model=ScenarioRead)
def put_decisions(
    scenario_id: UUID,
    request: DecisionsReplace,
    session: Session = Depends(get_session),
) -> ScenarioRead:
    try:
        with session.begin():
            replace_decisions(session, scenario_id, request.decisions)
            scenario = session.get(Scenario, scenario_id)
            if scenario is None:
                raise HTTPException(status_code=404, detail="Scenario not found")
            result = _scenario_read(session, scenario)
    except ScenarioError as exc:
        raise _scenario_error(exc) from None
    return result


@router.post("/scenarios/{scenario_id}/preview", response_model=ScenarioPreviewRead)
def post_preview(
    scenario_id: UUID,
    request: DecisionsReplace,
    session: Session = Depends(get_session),
) -> ScenarioPreviewRead:
    scenario = session.get(Scenario, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if scenario.status != ScenarioStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Only draft scenarios can be previewed")
    try:
        selected = validate_plan(session, scenario.dataset_id, request.decisions, complete=True)
        baseline = scoring.calculate(session, scenario.dataset_id, [], baseline=True)
        projected = scoring.calculate(session, scenario.dataset_id, request.decisions)
    except ScenarioError as exc:
        raise _scenario_error(exc) from None

    dataset = session.get(Dataset, scenario.dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    districts = list(session.scalars(
        select(District).where(District.dataset_id == dataset.id).order_by(District.code)
    ))
    current_cost = sum(item.cost for _, item in selected)
    results = []
    for district in districts:
        baseline_indicators = baseline.indicators[district.id]
        projected_indicators = projected.indicators[district.id]
        results.append(DistrictPreviewRead(
            district_id=district.id,
            district_code=district.code,
            district_name=district.name,
            population_share=district.population_share,
            baseline_score=baseline.district_scores[district.id],
            projected_score=projected.district_scores[district.id],
            score_delta=projected.district_scores[district.id] - baseline.district_scores[district.id],
            baseline_indicators=baseline_indicators,
            projected_indicators=projected_indicators,
        ))
    return ScenarioPreviewRead(
        current_cost=current_cost,
        remaining_budget=dataset.initial_budget - current_cost,
        baseline_score=baseline.score,
        projected_score=projected.score,
        score_delta=projected.score - baseline.score,
        districts=results,
    )


@router.post("/scenarios/{scenario_id}/submit", response_model=ScenarioRead)
def post_submit(scenario_id: UUID, session: Session = Depends(get_session)) -> ScenarioRead:
    try:
        with session.begin():
            scenario = submit_scenario(session, scenario_id)
            result = _scenario_read(session, scenario)
    except ScenarioError as exc:
        raise _scenario_error(exc) from None
    return result


@router.post("/scenarios/{scenario_id}/evaluate", response_model=EvaluationRead)
def post_evaluate(scenario_id: UUID, session: Session = Depends(get_session)) -> EvaluationRead:
    try:
        with session.begin():
            scenario = session.scalar(
                select(Scenario).where(Scenario.id == scenario_id).with_for_update()
            )
            if scenario is None:
                raise HTTPException(status_code=404, detail="Scenario not found")
            existing = session.scalar(select(Evaluation).where(Evaluation.scenario_id == scenario.id))
            if existing is not None:
                return _evaluation_read(session, existing)
            if scenario.status != ScenarioStatus.SUBMITTED:
                raise HTTPException(status_code=409, detail="Submit the scenario before evaluation")

            choices = [
                DecisionSelect(initiative_id=row.initiative_id, district_id=row.district_id)
                for row in session.scalars(select(Decision).where(Decision.scenario_id == scenario.id))
            ]
            baseline = scoring.calculate(session, scenario.dataset_id, [], baseline=True)
            projected = scoring.calculate(session, scenario.dataset_id, choices)
            dataset = session.get(Dataset, scenario.dataset_id)
            if dataset is None:
                raise HTTPException(status_code=409, detail="Scenario dataset is unavailable")
            districts = list(session.scalars(
                select(District).where(District.dataset_id == dataset.id).order_by(District.code)
            ))
            selected = validate_plan(session, scenario.dataset_id, choices, complete=True)
            decision_context = []
            for choice, initiative in selected:
                district = session.get(District, choice.district_id) if choice.district_id else None
                decision_context.append({
                    "initiative": {
                        "id": str(initiative.id),
                        "code": initiative.code,
                        "title": initiative.title,
                        "direction": initiative.direction.value,
                        "scope": initiative.scope.value,
                        "cost": initiative.cost,
                        "lag_quarters": initiative.lag_quarters,
                        "effects": {metric.value: getattr(initiative, metric.value) for metric in Metric},
                    },
                    "district": None if district is None else {"code": district.code, "name": district.name},
                })
            context = {
                "dataset": {
                    "version": dataset.version,
                    "scoring_version": dataset.scoring_version,
                    "initial_budget": dataset.initial_budget,
                    "horizon_quarters": dataset.horizon_quarters,
                },
                "scenario": {"id": str(scenario.id), "team_name": scenario.team_name},
                "decisions": decision_context,
                "scores": {
                    "baseline_score": baseline.score,
                    "final_score": projected.score,
                    "score_delta": projected.score - baseline.score,
                    "districts": [{
                        "code": district.code,
                        "name": district.name,
                        "population_share": district.population_share,
                        "score": projected.district_scores[district.id],
                        "indicators": projected.indicators[district.id],
                    } for district in districts],
                },
            }
            from app.services.openai_analysis import (
                PROMPT_VERSION,
                OpenAIAnalysisError,
                OpenAIConfigurationError,
                explain_evaluation,
            )

            try:
                explanation, model_name = explain_evaluation(context)
            except OpenAIConfigurationError:
                raise HTTPException(
                    status_code=503,
                    detail="OpenAI analysis is not configured; scenario remains submitted",
                ) from None
            except OpenAIAnalysisError:
                raise HTTPException(
                    status_code=502,
                    detail="OpenAI explanation failed; scenario remains submitted",
                ) from None
            ai_values = {
                "ai_model": model_name,
                "prompt_version": PROMPT_VERSION,
                "summary": explanation["summary"],
                "strengths": explanation["strengths"],
                "risks": explanation["risks"],
                "consequences": explanation["consequences"],
                "recommendations": explanation["recommendations"],
            }

            evaluation = Evaluation(
                scenario_id=scenario.id,
                dataset_id=scenario.dataset_id,
                baseline_score=baseline.score,
                final_score=projected.score,
                scoring_version=dataset.scoring_version,
                **ai_values,
            )
            session.add(evaluation)
            session.flush()
            session.add_all([
                DistrictResult(
                    evaluation_id=evaluation.id,
                    district_id=district.id,
                    dataset_id=dataset.id,
                    **projected.indicators[district.id],
                )
                for district in districts
            ])
            scenario.status = ScenarioStatus.EVALUATED
            scenario.submitted_at = scenario.submitted_at or datetime.now(timezone.utc)
            session.flush()
            return _evaluation_read(session, evaluation)
    except ScenarioError as exc:
        raise _scenario_error(exc) from None
