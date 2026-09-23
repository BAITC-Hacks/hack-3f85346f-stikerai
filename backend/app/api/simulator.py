import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_session
from app.domain import ScenarioStatus
from app.models import Calculation, Dataset, Decision, District, Explanation, Initiative, InitiativeRule, Scenario
from app.schemas import (
    CalculationRead, CatalogRead, CivicContext, CopyRequest, DatasetRead, DecisionRead, DecisionSelect,
    DistrictRead, ExplanationRead, InitiativeRead, InitiativeRuleRead, PlanSave,
    RevisionRequest, ScenarioRead, ScenarioStart,
)
from app.services import llm
from app.services.results import build_result
from app.services.scenarios import replace_decisions, submit_scenario

router = APIRouter(tags=["simulator"])
COOKIE = "stikerai_session"
LEASE_SECONDS = 90


def problem(code, message, status=409):
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


def owner(request: Request) -> str:
    token = request.cookies.get(COOKIE, "")
    if len(token) != 43:
        problem("SESSION_REQUIRED", "Обновите страницу, чтобы начать сессию.", 401)
    return hashlib.sha256(token.encode()).hexdigest()


def write_guard(x_requested_with: str = Header(default="")):
    if x_requested_with != "stikerai":
        problem("REQUEST_REJECTED", "Запрос должен быть отправлен из приложения.", 403)


def owned(session: Session, scenario_id: UUID, owner_hash: str, *, lock=False) -> Scenario:
    query = select(Scenario).where(Scenario.id == scenario_id, Scenario.owner_hash == owner_hash)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    scenario = session.scalar(query)
    if scenario is None:
        problem("NOT_FOUND", "Сценарий не найден.", 404)
    return scenario


def read_scenario(session: Session, scenario: Scenario) -> ScenarioRead:
    decisions = list(session.scalars(select(Decision).where(Decision.scenario_id == scenario.id).order_by(Decision.initiative_id)))
    budget = session.get(Dataset, scenario.dataset_id).initial_budget
    spent = sum(session.get(Initiative, item.initiative_id).cost for item in decisions)
    return ScenarioRead(**{field: getattr(scenario, field) for field in
        ("id", "dataset_id", "team_name", "status", "created_at", "submitted_at", "revision")},
        initial_budget=budget, spent_budget=spent, remaining_budget=budget - spent,
        decisions=[DecisionRead.model_validate(item) for item in decisions])


def check_revision(scenario, expected):
    if scenario.revision != expected:
        problem("STALE_REVISION", "Сценарий изменён в другой вкладке. Обновите данные.")


@router.post("/session", dependencies=[Depends(write_guard)])
def start_session(request: Request, response: Response):
    if len(request.cookies.get(COOKIE, "")) != 43:
        response.set_cookie(COOKIE, secrets.token_urlsafe(32), httponly=True, samesite="strict",
                            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", max_age=30 * 86400)
    return {"status": "ok"}


@router.get("/catalog", response_model=CatalogRead)
def catalog(dataset_id: UUID | None = None, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id) if dataset_id else session.scalar(select(Dataset).order_by(Dataset.created_at.desc(), Dataset.id).limit(1))
    if dataset is None:
        problem("DATASET_MISSING", "Датасет не загружен. Выполните команду seed из README.", 503)
    return CatalogRead(dataset=DatasetRead.model_validate(dataset),
        districts=[DistrictRead.model_validate(row) for row in session.scalars(select(District).where(District.dataset_id == dataset.id).order_by(District.code))],
        initiatives=[InitiativeRead.model_validate(row) for row in session.scalars(select(Initiative).where(Initiative.dataset_id == dataset.id).order_by(Initiative.code))],
        rules=[InitiativeRuleRead.model_validate(row) for row in session.scalars(select(InitiativeRule).where(InitiativeRule.dataset_id == dataset.id))],
        baseline=build_result(session, dataset, [], baseline=True))


@router.get("/scenarios", response_model=list[ScenarioRead])
def list_scenarios(owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    return [read_scenario(session, row) for row in session.scalars(select(Scenario).where(Scenario.owner_hash == owner_hash)
                                                                .order_by(Scenario.created_at.desc(), Scenario.id).limit(50))]


def insert_scenario(session, request, owner_hash, source=None):
    existing = session.scalar(select(Scenario).where(Scenario.owner_hash == owner_hash, Scenario.request_id == request.request_id))
    if existing:
        return existing
    if session.get(Dataset, request.dataset_id) is None:
        problem("DATASET_MISSING", "Датасет не найден.", 404)
    try:
        with session.begin_nested():
            row = Scenario(dataset_id=request.dataset_id, team_name=request.team_name,
                           owner_hash=owner_hash, request_id=request.request_id)
            session.add(row)
            session.flush()
            if source:
                choices = [DecisionSelect(initiative_id=d.initiative_id, district_id=d.district_id)
                           for d in session.scalars(select(Decision).where(Decision.scenario_id == source.id))]
                replace_decisions(session, row.id, choices)
        return row
    except IntegrityError:
        row = session.scalar(select(Scenario).where(Scenario.owner_hash == owner_hash, Scenario.request_id == request.request_id))
        if row is None:
            raise
        return row


@router.post("/scenarios", response_model=ScenarioRead, dependencies=[Depends(write_guard)])
def start_scenario(request: ScenarioStart, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    with session.begin():
        return read_scenario(session, insert_scenario(session, request, owner_hash))


@router.get("/scenarios/{scenario_id}", response_model=ScenarioRead)
def get_scenario(scenario_id: UUID, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    return read_scenario(session, owned(session, scenario_id, owner_hash))


@router.put("/scenarios/{scenario_id}/decisions", response_model=ScenarioRead, dependencies=[Depends(write_guard)])
def save_plan(scenario_id: UUID, request: PlanSave, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    with session.begin():
        scenario = owned(session, scenario_id, owner_hash, lock=True)
        check_revision(scenario, request.expected_revision)
        replace_decisions(session, scenario.id, request.decisions)
        scenario.revision += 1
        session.flush()
        return read_scenario(session, scenario)


@router.post("/scenarios/{scenario_id}/preview", response_model=CalculationRead, dependencies=[Depends(write_guard)])
def preview(scenario_id: UUID, request: RevisionRequest, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    with session.begin():
        scenario = owned(session, scenario_id, owner_hash, lock=True)
        check_revision(scenario, request.expected_revision)
        choices = [DecisionSelect(initiative_id=d.initiative_id, district_id=d.district_id)
                   for d in session.scalars(select(Decision).where(Decision.scenario_id == scenario.id))]
        return build_result(session, session.get(Dataset, scenario.dataset_id), choices)


@router.post("/scenarios/{scenario_id}/submit", response_model=CalculationRead, dependencies=[Depends(write_guard)])
def submit(scenario_id: UUID, request: RevisionRequest, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    with session.begin():
        scenario = owned(session, scenario_id, owner_hash, lock=True)
        existing = session.scalar(select(Calculation).where(Calculation.scenario_id == scenario.id))
        if existing:
            return CalculationRead.model_validate(existing.payload)
        check_revision(scenario, request.expected_revision)
        submit_scenario(session, scenario.id)
        choices = [DecisionSelect(initiative_id=d.initiative_id, district_id=d.district_id)
                   for d in session.scalars(select(Decision).where(Decision.scenario_id == scenario.id))]
        result = build_result(session, session.get(Dataset, scenario.dataset_id), choices)
        calculation = Calculation(scenario_id=scenario.id, payload=result.model_dump(mode="json"))
        session.add(calculation)
        session.flush()
        session.add(Explanation(calculation_id=calculation.id))
        scenario.status = ScenarioStatus.EVALUATED
        scenario.revision += 1
        return result


@router.get("/scenarios/{scenario_id}/result", response_model=CalculationRead)
def result(scenario_id: UUID, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    owned(session, scenario_id, owner_hash)
    row = session.scalar(select(Calculation).where(Calculation.scenario_id == scenario_id))
    if row is None:
        problem("RESULT_MISSING", "Сначала отправьте сценарий на анализ.", 404)
    return CalculationRead.model_validate(row.payload)


@router.post("/scenarios/{scenario_id}/copy", response_model=ScenarioRead, dependencies=[Depends(write_guard)])
def copy_scenario(scenario_id: UUID, request: CopyRequest, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    with session.begin():
        source = owned(session, scenario_id, owner_hash, lock=True)
        return read_scenario(session, insert_scenario(session, ScenarioStart(dataset_id=source.dataset_id,
            team_name=source.team_name, request_id=request.request_id), owner_hash, source))


def expired(row):
    return row.status == "running" and (row.started_at is None or
        row.started_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc) - timedelta(seconds=LEASE_SECONDS))


def explanation_view(row):
    return ExplanationRead(status="failed" if expired(row) else row.status, payload=row.payload,
        error="Предыдущий запрос прервался. Повторите AI-анализ." if expired(row) else row.error)


def explanation_row(session, scenario_id, owner_hash, lock=False):
    owned(session, scenario_id, owner_hash, lock=lock)
    calculation = session.scalar(select(Calculation).where(Calculation.scenario_id == scenario_id))
    if calculation is None:
        problem("RESULT_MISSING", "Сначала отправьте сценарий на анализ.", 409)
    query = select(Explanation).where(Explanation.calculation_id == calculation.id)
    row = session.scalar(query.with_for_update() if lock else query)
    return calculation, row


@router.get("/scenarios/{scenario_id}/explanation", response_model=ExplanationRead)
def get_explanation(scenario_id: UUID, owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    _, row = explanation_row(session, scenario_id, owner_hash)
    return explanation_view(row)


def run_explanation(engine, explanation_id, attempt_id, payload):
    try:
        output = llm.request_explanation(payload).model_dump(mode="json")
        error = None
    except Exception:
        # Never expose provider response bodies, keys, or request headers to the browser.
        output, error = None, "AI-объяснение недоступно. Расчёт сохранён; попробуйте ещё раз."
    with Session(engine) as session, session.begin():
        row = session.scalar(select(Explanation).where(Explanation.id == explanation_id).with_for_update())
        if row and row.attempt_id == attempt_id and row.status == "running":
            row.payload, row.error = output, error
            row.status = "completed" if output else "failed"


@router.post("/scenarios/{scenario_id}/explanation", response_model=ExplanationRead, dependencies=[Depends(write_guard)])
def explain(scenario_id: UUID, tasks: BackgroundTasks, owner_hash: str = Depends(owner), session: Session = Depends(get_session), civic_context: CivicContext | None = None):
    with session.begin():
        calculation, row = explanation_row(session, scenario_id, owner_hash, lock=True)
        if row.status == "completed" or (row.status == "running" and not expired(row)):
            return explanation_view(row)
        if not os.getenv("OPENAI_API_KEY") or not os.getenv("OPENAI_MODEL"):
            row.status, row.error = "failed", "AI не настроен на сервере. Численный результат доступен."
            return explanation_view(row)
        row.status, row.error, row.started_at = "running", None, datetime.now(timezone.utc)
        row.attempt_id, row.model, row.prompt_version = uuid4(), os.environ["OPENAI_MODEL"], llm.PROMPT_VERSION
        session.flush()
        payload = dict(calculation.payload)
        if civic_context is not None:
            payload["citizen_context"] = civic_context.model_dump(mode="json")
        tasks.add_task(run_explanation, session.get_bind(), row.id, row.attempt_id, payload)
        return explanation_view(row)
