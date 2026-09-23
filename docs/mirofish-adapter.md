# MiroFish adapter spike

The adapter is an opt-in boundary in `backend/app/services/mirofish.py`, exposed
through `GET /api/mirofish/capability` and `POST /api/mirofish/scenario`. It
does not collect public data or alter the existing score. Submission returns
503 while disabled or incompletely configured.
It accepts exactly `proposal_text` and an approved `evidence_brief` made of
structured numeric aggregates with source, period, geography, and suppression
metadata. Pydantic rejects additional properties at all levels, including raw
comments, posts, user IDs, handles, profile data, or arbitrary nested fields.
Validation errors do not echo the submitted payload.

## Configuration and outbound behavior

The default `.env.example` sets `MIROFISH_ENABLED=false` and leaves the gateway
URL/token empty. In that state `submit()` validates the contract then raises a
disabled error; `capability()` reports state without making a network request.
Outbound submission occurs only when enabled and both URL and bearer token are
set. The target must be an authenticated, project-controlled gateway. Remote
URLs require HTTPS; HTTP is restricted to local development hosts.

The adapter posts to `POST /api/astana/scenario` and expects this response
shape:

```json
{
  "result_text": "Scenario hypotheses...",
  "run_id": "optional-provider-run-id",
  "limitations": ["optional additional caveat"]
}
```

The response wrapper always labels output `exploratory scenario hypotheses`
and `not calibrated`, with fixed warnings that personas are not a
representative poll and output does not modify the simulator score. The client
does not expose gateway error bodies, caps the response at 1 MB, and uses a
configurable timeout from 1–180 seconds.

This route is an adapter contract for a controlled gateway, **not a documented
native MiroFish endpoint**. Upstream currently uses a multi-step workflow
(document ingestion/graph build, environment preparation, simulation, report)
rather than a single request. Its application is AGPL-3.0; review compliance
before deployment, modification, or network use. Upstream GitHub security
reports describe missing authentication on its API; do not place an unprotected
instance on a reachable network. The gateway must enforce authentication,
access controls, logging minimization, request limits, deletion/retention, and
the same input schema. See [upstream repository](https://github.com/666ghj/MiroFish),
[license](https://github.com/666ghj/MiroFish/blob/main/LICENSE), and
[upstream API security report](https://github.com/666ghj/MiroFish/issues/487).

No live service was configured or called for this spike. No tests were run.

The API POST requires the browser session cookie from `POST /api/session` and
`X-Requested-With: stikerai`, matching other application writes. The gateway
bearer token remains server-side.
