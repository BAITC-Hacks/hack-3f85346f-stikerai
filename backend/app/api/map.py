"""Versioned geographic context, separate from synthetic scoring datasets."""
import json
from functools import lru_cache
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.simulator import problem
from app.db import get_session
from app.models import Dataset, District
from app.schemas import MapDistrictCollection, MapDistrictFeature, MapDistrictProperties

router = APIRouter(prefix="/map", tags=["map"])
DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "geography"


@lru_cache
def boundary_snapshot():
    return json.loads((DATA_DIR / "astana-districts.geojson").read_text(encoding="utf-8"))


@lru_cache
def boundary_crosswalk():
    return json.loads((DATA_DIR / "crosswalk.json").read_text(encoding="utf-8"))


@router.get("/districts", response_model=MapDistrictCollection)
def districts(dataset_id: UUID, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    if dataset is None:
        problem("DATASET_MISSING", "Датасет не найден.", 404)
    rows = {row.code: row for row in session.scalars(select(District).where(District.dataset_id == dataset_id))}
    snapshot = boundary_snapshot()
    mappings = boundary_crosswalk().get(snapshot['boundary_version'], {}).get(dataset.version, {})
    features = []
    for feature in snapshot['features']:
        props = feature['properties']
        mapping = mappings.get(props['code'], {})
        candidate = rows.get(mapping.get('district_code'))
        # Names are not a geographic crosswalk. Only reviewed links may colour polygons.
        verified = candidate is not None and mapping.get('status') == 'verified' and bool(mapping.get('evidence_url'))
        state = 'verified' if verified else 'unverified' if candidate else 'missing'
        features.append(MapDistrictFeature(type='Feature', id=feature['id'], geometry=feature['geometry'],
            properties=MapDistrictProperties(code=props['code'], name=props['name'], source_url=props['source_url'],
                district_id=candidate.id if verified else None,
                candidate_district_id=candidate.id if candidate else None,
                mapping_status=state,
                mapping_note=mapping.get('note', 'Нет соответствия в этой версии датасета.'))))
    return MapDistrictCollection(type='FeatureCollection', features=features, dataset_id=dataset_id,
        boundary_version=snapshot['boundary_version'], source_snapshot_at=snapshot['source_snapshot_at'],
        retrieved_at=snapshot['retrieved_at'], attribution=snapshot['attribution'], license_url=snapshot['license_url'])
