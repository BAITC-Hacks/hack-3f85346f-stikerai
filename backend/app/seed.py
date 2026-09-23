"""Idempotent development seed: python -m app.seed."""
import json
from math import isclose
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_engine
from app.domain import InitiativeScope, Metric, RuleKind, RuleScope
from app.models import Dataset, District, Initiative, InitiativeRule
from app.schemas import DistrictRead, InitiativeRead


def seed(session: Session) -> Dataset:
    data = json.loads((Path(__file__).parents[1] / "data" / "astana-v1.json").read_text(encoding="utf-8"))
    existing = session.scalar(select(Dataset).where(Dataset.version == data["version"]))
    if existing:
        return existing
    districts, initiatives, rules = (data.pop(key) for key in ("districts", "initiatives", "rules"))
    if set(data["metric_weights"]) != set(Metric) or not isclose(sum(data["metric_weights"].values()), 1):
        raise ValueError("Metric weights must include all ten metrics and sum to one")
    if not isclose(sum(d["population_share"] for d in districts), 1):
        raise ValueError("Population shares must sum to one")
    dataset = Dataset(id=uuid5(NAMESPACE_URL, data["version"]), **data)
    session.add(dataset)
    session.flush()
    for values in districts:
        district = District(id=uuid5(dataset.id, values["code"]), dataset_id=dataset.id, **values)
        session.add(district)
        session.flush()
        DistrictRead.model_validate(district)
    catalog = {}
    for values in initiatives:
        effects = {metric.value: 0.0 for metric in Metric} | values.pop("effects")
        if not 0 <= values["lag_quarters"] <= dataset.horizon_quarters:
            raise ValueError("Initiative lag is outside the simulation horizon")
        item = Initiative(id=uuid5(dataset.id, values["code"]), dataset_id=dataset.id, **values, **effects)
        session.add(item)
        session.flush()
        InitiativeRead.model_validate(item)
        catalog[item.code] = item
    for values in rules:
        first, second = catalog[values.pop("first")], catalog[values.pop("second")]
        if values["kind"] == RuleKind.SYNERGY and first.scope != InitiativeScope.DISTRICT:
            raise ValueError("First-district synergy must start with a district initiative")
        if values["scope"] == RuleScope.SAME_DISTRICT and any(
            item.scope != InitiativeScope.DISTRICT for item in (first, second)
        ):
            raise ValueError("Same-district conflicts require district initiatives")
        session.add(InitiativeRule(dataset_id=dataset.id, first_id=first.id, second_id=second.id, **values))
    session.flush()
    return dataset


if __name__ == "__main__":
    with Session(get_engine()) as session, session.begin():
        dataset = seed(session)
        print(f"Dataset ready: {dataset.version} ({dataset.id})")
