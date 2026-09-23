"""Stable values shared by persistence, validation, and the frontend contract."""

from enum import StrEnum


class Direction(StrEnum):
    TRANSPORT = "transport"
    ECOLOGY = "ecology"
    SOCIAL = "social"
    SAFETY = "safety"
    SERVICES = "services"


class ScenarioStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    EVALUATED = "evaluated"


MAX_BUDGET = 1_000_000_000_000


class Metric(StrEnum):
    T1 = "t1"
    T2 = "t2"
    E1 = "e1"
    E2 = "e2"
    S1 = "s1"
    S2 = "s2"
    B1 = "b1"
    B2 = "b2"
    C1 = "c1"
    C2 = "c2"


class InitiativeScope(StrEnum):
    DISTRICT = "district"
    CITY = "city"


class RuleKind(StrEnum):
    SYNERGY = "synergy"
    CONFLICT = "conflict"


class RuleScope(StrEnum):
    GLOBAL = "global"
    SAME_DISTRICT = "same_district"
    FIRST_DISTRICT = "first_district"


REQUIRED_DECISIONS = 5
MAX_PER_DIRECTION = 2
