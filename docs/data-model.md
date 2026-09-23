# Simulator data model

The data layer implements `PRD.md` and the more specific rules in `datadoc.md`.
PostgreSQL 16 stores the application data, SQLAlchemy maps the tables, Alembic
manages schema changes, and Pydantic defines wire contracts. React types are
generated from those contracts with `python scripts/export_types.py` from `backend`.

## Entities

- **Dataset**: immutable published version, shared budget, eight-quarter horizon,
  ten metric weights and scoring version. All compared teams must use the same
  dataset. The client cannot set its own budget or effect assumptions.
- **District**: dataset, code/name, population share, and ten baseline indicators.
- **Initiative**: dataset, catalog code (M1–M14), direction, district/city scope,
  cost, lag and ten signed full-effect deltas. The district is chosen per decision.
- **InitiativeRule**: two initiatives from the same dataset, a conflict or synergy,
  and its scope. Conflicts can be global or same-district. A synergy stores its
  metric and fixed bonus, applied to the first initiative's chosen district.
- **Scenario**: dataset, team label, draft/submitted/evaluated status and timestamps.
  A team label is not an authenticated identity; account ownership is future work.
- **Decision**: scenario, initiative and nullable district. Composite foreign keys
  prohibit cross-dataset references. `(scenario_id, initiative_id)` is unique.
- **Evaluation**: one completed report per scenario, baseline/final city scores,
  scoring version, AI model/prompt version, explanation, strengths, risks,
  consequences and recommendations.
- **DistrictResult**: evaluation, district and ten resulting indicator values.
  Baselines remain in the immutable source dataset.

All entity IDs are UUIDs. API timestamps use ISO strings; PostgreSQL stores
timezone-aware timestamps. Money is integer virtual units, with an upper bound
of 1e12 to stay within JavaScript's exact integer range. There are no real payments.

## Metrics and directions

Wire/database names are lowercase versions of the source codes:

- `t1`, `t2`: road congestion relief and public transport access (`transport`).
- `e1`, `e2`: green space and air quality (`ecology`).
- `s1`, `s2`: schools/kindergartens and primary healthcare (`social`).
- `b1`, `b2`: street safety and road safety (`safety`).
- `c1`, `c2`: utility reliability and response to resident requests (`services`).

All indicators use [0, 100], higher is better; full effect deltas use [-100, 100].
City Score is a different type: penalties can make it negative, so it is not
clamped to the indicator range.

## Validation and transaction boundary

`app.services.scenarios` accepts only initiative/district IDs and derives cost and
direction from the catalog. A valid submitted plan has exactly five distinct
initiatives, at most two per direction, cost at most 100, valid targets and no
applicable conflicts. Drafts can contain zero through five decisions.

`replace_decisions` replaces the complete unordered plan atomically, after validation.
Use it and `submit_scenario` inside `with session.begin():`. They lock the parent
scenario with PostgreSQL `SELECT ... FOR UPDATE` so edits and submission serialize.
Submitted/evaluated plans cannot be edited through this service. Every future writer
must use the same lock. HTTP routes enforce anonymous session ownership and optimistic
revisions as described in [integration.md](integration.md).

The database enforces ranges, enum values, unique choices and same-dataset foreign
keys. Aggregate budget limits, five-decision counts, target scope, conflicts and
dataset immutability are application rules, not database triggers. Direct SQL can
bypass those rules; do not expose raw ORM writes in future endpoints. To change
starting conditions, publish a new dataset version rather than mutate historical
catalog rows. Foreign-key deletes are restricted to preserve history.

`ScenarioRead` budget totals/decisions are assembled read models, not direct ORM dumps.
Migration 0002 adds **Calculation**, an immutable JSON snapshot of a submitted plan's
numeric results, and **Explanation**, a separately persisted AI job/result. Submission
atomically creates both and marks the scenario evaluated. Explanation failures never
remove the calculation. The original Evaluation/DistrictResult tables remain for
compatibility with the initial schema; the current HTTP workflow uses Calculation
and Explanation. Scenario owner hashes, idempotency request IDs and revisions are
also added in 0002; legacy ownerless scenarios are not exposed through the API.

## Reference scoring and supplied data

`app.services.scoring.calculate` verifies the exact source formula: apply full
effects scaled by `(H - lag) / H`; add fixed synergies; clamp indicators once;
weight the ten metrics and district population shares; then calculate
`0.7 * average + 0.3 * weakest - count(indicator < 40)`.
Scores are not rounded during calculation and invalid plans raise a reason
instead of returning a score. AI receives calculated numbers to explain them.
The AI adapter uses these values for structured explanations; configuration and
retry behavior are documented in [integration.md](integration.md).

`backend/data/astana-v1.json` contains the five named districts, 14 initiatives,
three synergies and three conflicts from `datadoc.md`. They are synthetic values,
not measurements of the real city. Seed validation checks population/metric weights
and lags. The seed is repeatable, retaining an existing dataset version.

The regression tests independently fix the expected source examples:

- Baseline Score: **52.55768** (52.56 rounded), two critical indicators.
- M7/M8/M10 in Nura, M12 citywide and M5 in Saryarka: cost **95**, Score
  **56.54307**, zero critical indicators. The M10/M12 synergy is included.
- M9/M11/M10 in Nura, M12 citywide and M4 in Saryarka: valid at cost **61**.

## Running and evolving the database

```sh
docker compose up --build
docker compose exec backend python -m app.seed
```

Compose waits for PostgreSQL, applies migrations via the one-shot `migrate`
service, then starts the API. The `postgres_data` volume survives restarts and
`docker compose down`. The seed is optional; startup does not silently insert data.

For a local process, export `DATABASE_URL` (the root `.env` is not automatically
loaded by Python), then run from `backend`:

```sh
python -m alembic upgrade head
python -m app.seed
python -m alembic revision --autogenerate -m "describe schema change"
python scripts/export_types.py
```

Review generated migrations. The initial migration contains explicit operations
independent of future ORM changes. Compose passes separate PostgreSQL connection
fields, safely handling password punctuation; manually built local URLs must use
URL-encoded credentials. Default credentials are for local development.

Tests apply real migrations to SQLite with foreign keys enabled, exercise schema
round trips, validate plans and reproduce reference scores. CI repeats model tests
against PostgreSQL via `TEST_DATABASE_URL`, including a concurrent submission/edit
test. CI also checks generated TypeScript contracts are current.
