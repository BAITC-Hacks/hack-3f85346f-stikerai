"""Persistence for PRD.md and datadoc.md. Publish changes as new dataset versions."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON, BigInteger, CheckConstraint, DateTime, Enum, Float, ForeignKey,
    ForeignKeyConstraint, Index, Integer, MetaData, String, Text, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.domain import Direction, InitiativeScope, MAX_BUDGET, Metric, RuleKind, RuleScope, ScenarioStatus


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s", "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s", "pk": "pk_%(table_name)s",
    })


def enum_type(enum: type, name: str) -> Enum:
    return Enum(enum, name=name, native_enum=False, create_constraint=True,
                values_callable=lambda cls: [item.value for item in cls])


class Identity:
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Indicators:
    t1: Mapped[float] = mapped_column(Float)
    t2: Mapped[float] = mapped_column(Float)
    e1: Mapped[float] = mapped_column(Float)
    e2: Mapped[float] = mapped_column(Float)
    s1: Mapped[float] = mapped_column(Float)
    s2: Mapped[float] = mapped_column(Float)
    b1: Mapped[float] = mapped_column(Float)
    b2: Mapped[float] = mapped_column(Float)
    c1: Mapped[float] = mapped_column(Float)
    c2: Mapped[float] = mapped_column(Float)


def indicator_checks(low=0, high=100):
    return tuple(CheckConstraint(f"{m.value} >= {low} AND {m.value} <= {high}",
                                 name=f"{m.value}_range") for m in Metric)


class Dataset(Identity, Base):
    __tablename__ = "datasets"
    version: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    initial_budget: Mapped[int] = mapped_column(BigInteger)
    horizon_quarters: Mapped[int] = mapped_column(Integer)
    scoring_version: Mapped[str] = mapped_column(String(64))
    metric_weights: Mapped[dict[str, float]] = mapped_column(JSON)
    __table_args__ = (
        CheckConstraint(f"initial_budget > 0 AND initial_budget <= {MAX_BUDGET}", name="budget_range"),
        CheckConstraint("horizon_quarters > 0", name="positive_horizon"),
    )


class District(Identity, Indicators, Base):
    __tablename__ = "districts"
    dataset_id: Mapped[UUID] = mapped_column(ForeignKey("datasets.id"), index=True)
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(200))
    population_share: Mapped[float] = mapped_column(Float)
    __table_args__ = (
        UniqueConstraint("id", "dataset_id"), UniqueConstraint("dataset_id", "code"),
        CheckConstraint("population_share > 0 AND population_share <= 1", name="population_share_range"),
        *indicator_checks(),
    )


class Initiative(Identity, Indicators, Base):
    """Catalog entry; target district is selected on Decision, not in the catalog."""
    __tablename__ = "initiatives"
    dataset_id: Mapped[UUID] = mapped_column(ForeignKey("datasets.id"), index=True)
    code: Mapped[str] = mapped_column(String(32))
    direction: Mapped[Direction] = mapped_column(enum_type(Direction, "direction"))
    scope: Mapped[InitiativeScope] = mapped_column(enum_type(InitiativeScope, "initiative_scope"))
    title: Mapped[str] = mapped_column(String(200))
    cost: Mapped[int] = mapped_column(BigInteger)
    lag_quarters: Mapped[int] = mapped_column(Integer)
    __table_args__ = (
        UniqueConstraint("id", "dataset_id"), UniqueConstraint("dataset_id", "code"),
        CheckConstraint(f"cost >= 0 AND cost <= {MAX_BUDGET}", name="cost_range"),
        CheckConstraint("lag_quarters >= 0", name="nonnegative_lag"),
        *indicator_checks(-100, 100),
    )


class InitiativeRule(Identity, Base):
    __tablename__ = "initiative_rules"
    dataset_id: Mapped[UUID] = mapped_column(Uuid)
    first_id: Mapped[UUID] = mapped_column(Uuid)
    second_id: Mapped[UUID] = mapped_column(Uuid)
    kind: Mapped[RuleKind] = mapped_column(enum_type(RuleKind, "rule_kind"))
    scope: Mapped[RuleScope] = mapped_column(enum_type(RuleScope, "rule_scope"))
    metric: Mapped[Metric | None] = mapped_column(enum_type(Metric, "rule_metric"))
    delta: Mapped[float | None] = mapped_column(Float)
    __table_args__ = (
        ForeignKeyConstraint(["first_id", "dataset_id"], ["initiatives.id", "initiatives.dataset_id"]),
        ForeignKeyConstraint(["second_id", "dataset_id"], ["initiatives.id", "initiatives.dataset_id"]),
        UniqueConstraint("first_id", "second_id", "kind"),
        CheckConstraint("first_id <> second_id", name="different_initiatives"),
        CheckConstraint(
            "(kind = 'synergy' AND scope = 'first_district' AND metric IS NOT NULL "
            "AND delta IS NOT NULL AND delta >= -100 AND delta <= 100) OR "
            "(kind = 'conflict' AND scope IN ('global', 'same_district') AND metric IS NULL AND delta IS NULL)",
            name="rule_shape",
        ),
    )


class Scenario(Identity, Base):
    __tablename__ = "scenarios"
    dataset_id: Mapped[UUID] = mapped_column(ForeignKey("datasets.id"), index=True)
    team_name: Mapped[str] = mapped_column(String(120))
    status: Mapped[ScenarioStatus] = mapped_column(enum_type(ScenarioStatus, "scenario_status"), default=ScenarioStatus.DRAFT)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    owner_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    request_id: Mapped[UUID | None] = mapped_column(Uuid)
    revision: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    __table_args__ = (
        UniqueConstraint("id", "dataset_id"),
        Index("uq_scenarios_owner_request", "owner_hash", "request_id", unique=True),
        CheckConstraint("(status = 'draft' AND submitted_at IS NULL) OR "
                        "(status IN ('submitted', 'evaluated') AND submitted_at IS NOT NULL)", name="submission_state"),
    )


class Decision(Identity, Base):
    __tablename__ = "decisions"
    scenario_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    dataset_id: Mapped[UUID] = mapped_column(Uuid)
    initiative_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    district_id: Mapped[UUID | None] = mapped_column(Uuid)
    __table_args__ = (
        UniqueConstraint("scenario_id", "initiative_id"),
        ForeignKeyConstraint(["scenario_id", "dataset_id"], ["scenarios.id", "scenarios.dataset_id"]),
        ForeignKeyConstraint(["initiative_id", "dataset_id"], ["initiatives.id", "initiatives.dataset_id"]),
        ForeignKeyConstraint(["district_id", "dataset_id"], ["districts.id", "districts.dataset_id"]),
    )


class Evaluation(Identity, Base):
    __tablename__ = "evaluations"
    scenario_id: Mapped[UUID] = mapped_column(Uuid, unique=True)
    dataset_id: Mapped[UUID] = mapped_column(Uuid)
    # The critical-indicator penalty can make city scores negative; do not clamp.
    baseline_score: Mapped[float] = mapped_column(Float)
    final_score: Mapped[float] = mapped_column(Float)
    scoring_version: Mapped[str] = mapped_column(String(64))
    ai_model: Mapped[str] = mapped_column(String(200))
    prompt_version: Mapped[str] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text)
    strengths: Mapped[list[str]] = mapped_column(JSON)
    risks: Mapped[list[str]] = mapped_column(JSON)
    consequences: Mapped[list[str]] = mapped_column(JSON)
    recommendations: Mapped[list[str]] = mapped_column(JSON)
    __table_args__ = (
        UniqueConstraint("id", "dataset_id"),
        ForeignKeyConstraint(["scenario_id", "dataset_id"], ["scenarios.id", "scenarios.dataset_id"]),
        CheckConstraint("baseline_score <= 100 AND baseline_score >= -1.7976931348623157e308", name="baseline_range"),
        CheckConstraint("final_score <= 100 AND final_score >= -1.7976931348623157e308", name="final_range"),
    )


class DistrictResult(Indicators, Base):
    __tablename__ = "district_results"
    evaluation_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    district_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    dataset_id: Mapped[UUID] = mapped_column(Uuid)
    __table_args__ = (
        ForeignKeyConstraint(["evaluation_id", "dataset_id"], ["evaluations.id", "evaluations.dataset_id"]),
        ForeignKeyConstraint(["district_id", "dataset_id"], ["districts.id", "districts.dataset_id"]),
        *indicator_checks(),
    )


class Calculation(Identity, Base):
    __tablename__ = "calculations"
    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.id"), unique=True)
    payload: Mapped[dict] = mapped_column(JSON)


class Explanation(Identity, Base):
    __tablename__ = "explanations"
    calculation_id: Mapped[UUID] = mapped_column(ForeignKey("calculations.id"), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    payload: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(200))
    prompt_version: Mapped[str] = mapped_column(String(64), default="city-explanation-v1")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempt_id: Mapped[UUID | None] = mapped_column(Uuid)
    __table_args__ = (CheckConstraint("status IN ('pending', 'running', 'completed', 'failed')", name="status_values"),)
