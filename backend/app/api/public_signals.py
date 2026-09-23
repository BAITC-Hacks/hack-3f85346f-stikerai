"""Public Signals MVP: proposal registry and synthetic aggregate demo API.

This module intentionally has no collection adapter, persistence, or connection
to social platforms. Every aggregate below is fabricated for UI/API contract
development and must not be interpreted as observed public opinion.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/signals", tags=["public-signals"])

SMALL_CELL_THRESHOLD = 5
DEMO_DISCLAIMER = (
    "Synthetic demo data only. These values are fabricated, not observations, "
    "and are not representative of Astana residents or public opinion."
)


class Proposal(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    summary: str
    publisher: str
    status: Literal["demo"]
    published_at: None
    source_url: None
    source_type: Literal["synthetic_demo"]
    is_demo: Literal[True]


class AggregateCell(BaseModel):
    model_config = ConfigDict(frozen=True)

    time_bucket: str
    source: str
    language: str
    topic: str
    stance: Literal["support", "oppose", "mixed", "question"]
    count: int | None
    suppressed: bool


class SourceProvenance(BaseModel):
    model_config = ConfigDict(frozen=True)

    source_id: str
    source_type: Literal["synthetic_demo"]
    description: str
    collection_method: str
    retrieved_at: None
    source_url: None
    terms_review: str


class AggregateResponse(BaseModel):
    proposal: Proposal
    aggregates: list[AggregateCell]
    source_provenance: SourceProvenance
    uncertainty: list[str]
    suppression: dict[str, int | str]
    disclaimer: str
    demo_only: Literal[True]


_PROPOSALS = {
    "demo-bus-lane": Proposal(
        id="demo-bus-lane",
        title="Demo proposal: dedicated bus lane",
        summary="Illustrative proposal record for a future transit-priority discussion.",
        publisher="Synthetic Public Signals demo",
        status="demo",
        published_at=None,
        source_url=None,
        source_type="synthetic_demo",
        is_demo=True,
    ),
    "demo-neighborhood-park": Proposal(
        id="demo-neighborhood-park",
        title="Demo proposal: neighborhood park renewal",
        summary="Illustrative proposal record for a future public-space discussion.",
        publisher="Synthetic Public Signals demo",
        status="demo",
        published_at=None,
        source_url=None,
        source_type="synthetic_demo",
        is_demo=True,
    ),
}

# Counts are fabricated solely to exercise response rendering and small-cell
# suppression. Keep the small cells in fixtures so the suppression contract is
# visible to clients. No real platform, person, post, or consultation data.
_FIXTURE_CELLS: dict[str, list[AggregateCell]] = {
    "demo-bus-lane": [
        AggregateCell(time_bucket="demo", source="manual-demo", language="kk", topic="travel-time", stance="support", count=12, suppressed=False),
        AggregateCell(time_bucket="demo", source="manual-demo", language="ru", topic="travel-time", stance="support", count=8, suppressed=False),
        AggregateCell(time_bucket="demo", source="manual-demo", language="ru", topic="parking", stance="oppose", count=4, suppressed=False),
        AggregateCell(time_bucket="demo", source="manual-demo", language="kk", topic="accessibility", stance="question", count=3, suppressed=False),
    ],
    "demo-neighborhood-park": [
        AggregateCell(time_bucket="demo", source="manual-demo", language="kk", topic="green-space", stance="support", count=10, suppressed=False),
        AggregateCell(time_bucket="demo", source="manual-demo", language="ru", topic="maintenance", stance="question", count=6, suppressed=False),
        AggregateCell(time_bucket="demo", source="manual-demo", language="ru", topic="land-use", stance="oppose", count=2, suppressed=False),
    ],
}


def _public_cell(cell: AggregateCell) -> AggregateCell:
    if cell.count is not None and cell.count < SMALL_CELL_THRESHOLD:
        return cell.model_copy(update={"count": None, "suppressed": True})
    return cell


@router.get("/proposals", response_model=list[Proposal])
def list_proposals() -> list[Proposal]:
    """List the proposal registry. All entries are explicitly synthetic demos."""
    return list(_PROPOSALS.values())


@router.get("/proposals/{proposal_id}/aggregates", response_model=AggregateResponse)
def get_proposal_aggregates(proposal_id: str) -> AggregateResponse:
    """Return demo aggregates and their provenance/limitations for one proposal."""
    proposal = _PROPOSALS.get(proposal_id)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")

    cells = [_public_cell(cell) for cell in _FIXTURE_CELLS[proposal_id]]
    return AggregateResponse(
        proposal=proposal,
        aggregates=cells,
        source_provenance=SourceProvenance(
            source_id="public-signals-synthetic-fixtures-v1",
            source_type="synthetic_demo",
            description="Hand-authored synthetic fixtures used only to exercise the API contract.",
            collection_method="No collection. Values were fabricated for software demonstration.",
            retrieved_at=None,
            source_url=None,
            terms_review="Not applicable: no external source data is used.",
        ),
        uncertainty=[
            "No statistical confidence interval is meaningful for fabricated demo values.",
            "There is no source coverage, sampling frame, or population denominator.",
            "The values must not be used to infer resident sentiment or compare districts.",
        ],
        suppression={
            "threshold": SMALL_CELL_THRESHOLD,
            "rule": "Cells with count below threshold return count=null and suppressed=true.",
        },
        disclaimer=DEMO_DISCLAIMER,
        demo_only=True,
    )
