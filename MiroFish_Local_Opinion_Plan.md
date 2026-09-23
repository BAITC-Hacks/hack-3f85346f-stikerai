# Astana public opinion and MiroFish integration plan

**Status:** synthetic MVP built; no social-network data has been collected.
**Purpose:** monitor public reactions to specific Astana city proposals and
explore scenario outcomes without changing the existing synthetic dataset,
indicator values, or scoring rules.

## Recommendation

Build a separate, opt-in **Public Signals** module with two distinct stages:

1. **Observed discussion analysis:** gather only content available through
   approved APIs, official consultation records, or a licensed provider; group
   it by proposal, time, language, and coarse geography only where that
   geography is explicitly present and reliable.
2. **Scenario exploration:** create an evidence brief from aggregate findings
   and optionally provide that brief, the proposal text, and localized
   background documents to MiroFish for scenario exploration.

Do not merge this module into the existing Astana quality score. It is a
contextual evidence layer alongside the score. Do not call a MiroFish output a
forecast of how Astana residents will vote, feel, or behave. MiroFish describes
itself as an agent-based social simulation using LLM-generated personas,
behavior, and reports; its own project discussion cautions that the current
implementation does not guarantee calibrated opinion drift, confidence, or
causal validity ([project FAQ](https://github.com/666ghj/MiroFish/issues/726)).

## Current implementation status

- **Built:** demo-only proposal and aggregate API; proposal-centered dashboard
  panel; k=5 suppression; source provenance, uncertainty and synthetic-data
  warning; source-card and language-review templates; an opt-in MiroFish
  gateway adapter that accepts only a privacy-reviewed numeric brief.
- **Not connected:** platform collectors, live language/stance analysis,
  persistence for real source runs, a MiroFish gateway endpoint/instance, or a
  historical backtest. `.env.example` works for the local demo and leaves
  external integrations disabled.
- **Why:** provider access and data rights are not approved, Kazakhstan
  personal-data/legal review is outstanding, and MiroFish upstream does not
  provide the single-call gateway contract used by the adapter. UI values are
  invented demo fixtures, not a public-opinion sample.
- **Implementation paths:** `backend/app/api/public_signals.py`,
  `frontend/src/PublicSignalsPanel.tsx`,
  `backend/app/services/mirofish.py`, and
  `docs/enrichment/public-signals/`.

### Related Google DeepMind opportunities

- **WeatherNext 3:** strong new forecast-source candidate for weather and
  precipitation context, with approximately 5–10 km support and cloud-based
  access. Assess one Astana sample, terms, onboarding and costs; do not treat it
  as district-scale truth or official warnings. [Model docs](https://developers.google.com/weathernext/guides/models).
- **AlphaEarth Foundations:** potential 10 m annual satellite-embedding input
  for a locally labeled land-cover/change experiment. It supplies
  64-dimensional learned vectors rather than ready-to-use classes, and needs
  Earth Engine access and local spatial validation. [Earth Engine catalog](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL).
- **AlphaEvolve:** not a city-data or forecasting service. Its
  evaluation-driven algorithm search could inspire a benchmarked engineering
  experiment, but there is no planned runtime integration. Keep production
  scoring deterministic and reviewed. [DeepMind announcement](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/).

## Product question and unit of analysis

Analyze **a named public proposal**, not people. Examples include a proposed
street redesign, bus route change, park project, parking rule, or General Plan
amendment. Every analysis run should pin:

- proposal ID, publisher, canonical source URL, publication date, and exact
  version of the proposal text;
- collection interval, query terms and aliases in Kazakh and Russian, sources
  included/excluded, and retrieval timestamp;
- source coverage and access method, duplicates removed, language mix, and
  known gaps;
- topics, expressed positions (support / oppose / mixed / question / unrelated),
  reasons, and representative short excerpts only when allowed by source terms;
- uncertainty and caveats, including the fact that online discussion is
  self-selected and not a representative poll.

Use Kazakh and Russian as first-class languages, with code-switching and
transliteration represented in query design and manual quality checks. English
can be included when the proposal has meaningful English-language coverage.
Do not infer a poster's language, ethnicity, district, residency, or political
views from their name, profile, or writing style.

## Local sources: staged feasibility

| Priority | Source | Proposed use | Access / constraint |
|---|---|---|---|
| 1 | [Open legal acts public discussion portal](https://egov.kz/cms/en/articles/open-legalacts) | Structured reactions to draft regulations and local-government decisions; preserve proposal and comment provenance | Start with official exports or a documented public interface. Confirm terms, completeness, identifiers, retention, and whether comments can be reused before ingestion. |
| 1 | Official Astana Akimat / department / maslikhat announcements and public-hearing records | Reactions to a specific published proposal, including hearing materials and official replies | Use platform-provided APIs/exports or written permission. Do not scrape login-gated or blocked endpoints. An announcement's commenters are not a citywide sample. |
| 2 | [YouTube Data API](https://developers.google.com/youtube/v3/docs/commentThreads/list) on official public proposal videos | Query comments on a known official video, if comments are enabled | API key, quota, API policies, and platform deletion/retention requirements apply. This is scoped to known videos, not general social listening. |
| 2 | Telegram public channels | Monitor selected official channels and public discussion channels where lawful and technically supported | Telegram's APIs and terms do not turn all public posts into unrestricted bulk-use data. Review API terms, channel-specific constraints, privacy, and local counsel before use. Do not use private groups or user-level surveillance. |
| 3 | X API | Search posts by proposal terms and hashtags to add a distinct platform sample | Official search has time-window/access-tier constraints and pay-per-use/paid access; inspect current pricing and terms at activation. [Official search docs](https://docs.x.com/x-api/posts/search/introduction). |
| 3 | TikTok Research Tools | Research-only analysis of public video/comment discussion if access is available | Approval is limited to qualified non-profit researchers in specified regions; the published eligibility does not currently list Kazakhstan. Not a viable production dependency without approved access. [Eligibility](https://developers.tiktok.com/products/research-api). |
| Exclude initially | General web scraping, unofficial social-media scrapers, purchased opaque “sentiment” feeds, and individual-level profiling | None | Access instability, unclear reuse rights, platform policy and privacy risks, and opaque coverage make results difficult to defend. |

An open-data/API route is not automatic permission to republish raw content.
Before enabling any source, retain a source card with account/owner, terms
version and review date, permitted fields and purpose, quotas/cost, geographic
coverage, deletion obligations, retention, display/redistribution rules, and
the approved storage location.

## Candidate tools

### MiroFish

MiroFish is the candidate **scenario simulator**, not the collector or evidence
base. Its upstream repository is [666ghj/MiroFish](https://github.com/666ghj/MiroFish).
The upstream project is AGPL-3.0 and uses OASIS; deployment or modification
requires a licensing review before integration into this app or service. Do not
copy its code or deploy it as a network service until the project owner has
decided whether AGPL compliance is acceptable. Its dependencies and security
posture also need a fresh audit at implementation time.

Keep it isolated behind an adapter that accepts only the proposal and a
privacy-reviewed aggregate evidence brief. No direct access to source platforms,
raw comments, user IDs, handles, profile fields, or persistent per-user memory.
Compare its outputs with a simple non-agent baseline and label all outputs as
exploratory hypotheses.

### BettaFish / other social-listening systems

[BettaFish](https://github.com/666ghj/BettaFish) is a possible comparator for
collection, public-opinion analysis, and reporting. Its source connectors may
not work for Kazakhstan or remain authorized; audit its current upstream
license, supported platforms, access methods, Kazakh/Russian performance,
dependency security, and data retention before adoption. Do not select it based
on claims such as “millions of comments” or “predicts trends” without reproducing
coverage and quality locally.

Preferred first implementation is a small source-neutral pipeline in this repo
with provider adapters and a documented normalized aggregate schema. A
third-party listening engine can be substituted after the source and license
audit. This makes source compliance, language evaluation, and deletion behavior
inspectable.

## Local context to enrich the evidence brief

Attach source-linked context relevant to each proposal, subject to existing
enrichment licenses and geometry limitations:

- official proposal text, impact assessment, public-hearing minutes, and
  authority response;
- adopted General Plan policy and clearly separated *planned* versus
  *existing* infrastructure;
- current district/city boundaries only when a verified vintage crosswalk is
  available. The existing synthetic five-district model does not safely map to
  the city's current six-district geography;
- separately labeled transit, facility, environment, weather, and population
  evidence from the existing enrichment research package where provenance,
  license, date, and spatial support have been verified.

Until the boundary crosswalk is resolved, report citywide discussion and any
explicit neighborhood labels as text evidence. Do not geocode posters or assign
comments to a district from profile/location clues.

## Normalized data flow

```text
Proposal registry + source allowlist
              |
   approved source adapters (read-only)
              |
minimize -> deduplicate -> language/topic/stance review
              |
  aggregate counts + coverage + uncertainty
       /                            \
Public Signals UI          privacy-reviewed evidence brief
                                      |
                        optional MiroFish adapter
                                      |
                scenario hypotheses + limitations
```

Suggested records:

- `proposal`: stable ID, title, publisher, version/hash, source URL, dates,
  scope, and topic tags;
- `source_run`: provider, query/version, terms review date, retrieved window,
  access mode, quota/cost, counts, dedupe rate, languages, and failure/gap log;
- `aggregate`: proposal ID, time bucket, platform, language, topic, stance,
  count, method version, confidence/uncertainty, and suppression status;
- `evidence_brief`: aggregate-only narrative and cited context sources,
  generated timestamp, prompt/model/version, and human reviewer;
- `simulation_run`: simulator/version, scenario assumptions, agent-generation
  method, repetitions/seeds, outputs, sensitivity checks, and explicit
  exploratory label.

Keep raw text ephemeral where platform terms permit collection at all. Prefer
on-the-fly processing; persist only aggregates and source post IDs when required
for deduplication/deletion. If raw text must be retained, define a short
reviewed TTL, encrypt it, restrict access, and implement deletion propagation.
Never persist handles, names, profile metadata, inferred traits, or a person-level
stance history.

## Quality, safeguards, and success criteria

1. **Source validity:** confirm lawful/API access, local availability, current
   terms, quota/cost, collection rights, and deletion behavior for every source.
2. **Language quality:** create an adjudicated Kazakh/Russian sample, including
   code-switching, irony, negation, slang, and transliteration. Report per-
   language precision/recall for topic and stance; allow “unclear” rather than
   forcing classification.
3. **Coverage:** publish collected volume and available platform/language
   coverage, but do not use comment volume as a proxy for resident support.
   Detect likely duplicates, coordinated activity, and sudden platform-specific
   bursts without labeling individuals as bots or manipulators.
4. **Human review:** sample and audit classifications, excerpts, and topic
   summaries before a public-facing report. Provide a correction/appeal path.
5. **Privacy and law:** have Kazakhstan counsel review the Digital Code and
   personal-data rules applicable on deployment date. The Digital Code was
   adopted January 9, 2026 and entered into force July 12, 2026 according to
   official sources ([Adilet](https://adilet.zan.kz/rus/docs/K2600000255),
   [Ministry notice](https://www.gov.kz/memleket/entities/maidd/press/news/details/1257769?lang=ru)).
   Public visibility alone must not be treated as blanket permission for
   profiling, retention, or republishing.
6. **Prediction validation:** backtest only on dated, completed Astana
   proposals with observable outcomes and adequate evidence. Use time-based
   holdouts; compare against no-change, historical-frequency, and simple
   aggregate-statistic baselines. Publish calibration, error, uncertainty, and
   sample limitations. If valid outcomes are unavailable, call results
   scenario exploration, not prediction.
7. **No decision automation:** do not rank residents, target persuasion, infer
   individual political opinion, or automatically recommend approval/rejection
   of an Akim proposal. Present competing reasons and missing voices.

## Implementation work packages

1. **Governance/source approval:** owner approves source shortlist, use case,
   compliance review, and retention schedule. Deliver signed-off source cards.
2. **Proposal registry + official consultation adapter:** ingest proposal
   metadata and permitted comments; build provenance, pagination, dedupe, and
   deletion handling. Do not enable social-platform adapters until source
   approvals are complete.
3. **Language/stance evaluation:** build blinded Kazakh/Russian evaluation set
   from permitted or consented material; evaluate models; add human correction
   flow and uncertainty reporting.
4. **Aggregate API + UI:** proposal-centered timeline and topic/stance panel
   with coverage, platform and language mix, source links, and explicit
   non-representative-sample label. Keep behind a feature flag.
5. **MiroFish adapter spike:** license/security review; ingest synthetic and
   aggregate-only sample briefs; measure runtime, cost, repeatability, and
   sensitivity; no production prediction claim.
6. **Backtesting and release gate:** validate historical cases, privacy
   deletion, access control, source outages, stale data, and labels before
   exposing the feature to users.

## Release gates

- **Gate A — research demo:** manually curated, properly cited proposal/context
  evidence; synthetic simulation inputs only; no social collection.
- **Gate B — monitored pilot:** at least one approved source with documented
  terms; aggregate-only persistence; manually reviewed Kazakh/Russian quality;
  no individual-level data.
- **Gate C — public feature:** legal/source approval, validated deletion and
  correction paths, coverage/uncertainty UI, security review, historical
  evaluation, and MiroFish licensing decision. If prediction validation is not
  adequate, ship monitoring and scenario exploration only.

## Research references

- [MiroFish upstream](https://github.com/666ghj/MiroFish) and [MiroFish FAQ / model limitations](https://github.com/666ghj/MiroFish/issues/726)
- [OASIS simulation framework](https://github.com/camel-ai/oasis)
- [BettaFish upstream](https://github.com/666ghj/BettaFish)
- [Kazakhstan Open Legal Acts consultation portal](https://egov.kz/cms/en/articles/open-legalacts)
- [YouTube Data API commentThreads](https://developers.google.com/youtube/v3/docs/commentThreads/list)
- [X API search documentation](https://docs.x.com/x-api/posts/search/introduction)
- [TikTok Research Tools eligibility](https://developers.tiktok.com/products/research-api)
- [Kazakhstan Digital Code](https://adilet.zan.kz/rus/docs/K2600000255)
- [Astana enrichment plan and source audits](Data_Enrichment_Research_Plan.md)

Research checked 2026-09-23. Recheck platform access, terms, pricing,
eligibility, and local law before implementation; they can change.
