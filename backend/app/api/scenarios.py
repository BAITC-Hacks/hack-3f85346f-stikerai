"""Compatibility endpoints backed by the session-owned simulator workflow.

Keep scenario CRUD, revision checks and deterministic result persistence in
simulator.py so no duplicate route can bypass that workflow.
"""
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.simulator import catalog, explain, owner, write_guard
from app.db import get_session
from app.schemas import DatasetCurrentRead, ExplanationRead

router = APIRouter(tags=["datasets", "scenarios"])


@router.get("/datasets/current", response_model=DatasetCurrentRead)
def get_current_dataset(session: Session = Depends(get_session)):
    current = catalog(dataset_id=None, session=session)
    return DatasetCurrentRead(dataset=current.dataset, districts=current.districts,
                              initiatives=current.initiatives,
                              baseline_score=current.baseline.baseline_score)


@router.post("/scenarios/{scenario_id}/evaluate", response_model=ExplanationRead,
             dependencies=[Depends(write_guard)])
def evaluate_scenario(scenario_id: UUID, tasks: BackgroundTasks,
                      owner_hash: str = Depends(owner), session: Session = Depends(get_session)):
    """Alias for asynchronous explanation of an already saved numerical result."""
    return explain(scenario_id, tasks, owner_hash, session)
