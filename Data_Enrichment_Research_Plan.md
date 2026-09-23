# Astana data enrichment: research and implementation plan

## Objective

Add a spatial context layer that helps users understand the five district
profiles and evaluate city initiatives against real, documented geography.
Enrichment is additive: **do not edit `datadoc.md`, `backend/data/astana-v1.json`,
the existing indicator definitions or values, district population shares,
initiative catalog, rules, weights, or scoring formula.**

The current dataset remains the immutable synthetic baseline. External data is
stored as a separately versioned companion package, clearly labeled as
observed, estimated, or contextual. It does not silently replace or rescale
any existing value. A later decision to recalibrate the simulator requires a
new, reviewed dataset version and a separate change to the data documentation.

## Existing model to preserve

`datadoc.md` and `backend/data/astana-v1.json` define five districts, their
population shares, ten 0–100 indicators, 14 initiatives, initiative effects,
synergies, conflicts, budget, horizon, and scoring rules. Preserve these exact
keys and semantics:

| Existing key | Existing meaning | Enrichment may add context such as |
| --- | --- | --- |
| `t1` | Road congestion relief | Road network; observed traffic counts/speeds if a suitable source is found |
| `t2` | Transit access, including the stated stop-distance and service-frequency target | Stops, routes, schedules, and population distribution; stops alone are insufficient |
| `e1` | Green space per resident | Park/green polygons and population context; mapped green space may be incomplete |
| `e2` | Winter air quality | Time-stamped AQI/PM monitoring observations with station coverage and method |
| `s1` | School and kindergarten capacity versus need | Facility points, school places/enrollment, and population context |
| `s2` | Primary healthcare capacity versus need | Clinic/facility points, service type, and capacity where available |
| `b1` | Street safety, lighting, cameras, and incidents | Streetlights/cameras and suitably aggregated incidents, subject to privacy and source limitations |
| `b2` | Road safety | Geocoded/aggregated injury crashes and exposure data; citywide totals alone do not support district conclusions |
| `c1` | Utility reliability | District/time-tagged water/heat outages and duration, if provided by a verifiable source |
| `c2` | Speed of resolving service requests | Aggregate request counts and resolution times by district/category/period, with personal data removed |

These are research alignments, not new formulas or indicator inputs. A layer
can be useful to the map without being good enough to measure an indicator.

## Research questions and candidate sources

Research should establish availability, coverage, license, date, and usable
resolution before anyone downloads large extracts or draws conclusions.

| Priority | Candidate | What it may contribute | Known caveat / research question |
| --- | --- | --- | --- |
| 1 | [Astana city geo-information portal](https://www.gov.kz/memleket/entities/astana/activities/15951?lang=ru&parentId=360) and its linked [GIS portal](https://gis.esaulet.kz/portal/apps/experiencebuilder/experience/?id=b9f6d12fcdc644f6944a96d5c42b915f) | Official district/city boundaries and planning context | The city government describes district boundaries and planning layers. Confirm direct data export, source date, coordinate system, reuse rights, and whether the district boundaries match the five codes in `datadoc.md`. A viewable web map is not automatically an openly reusable dataset. |
| 1 | [Kazakhstan NSDI Geoportal](https://map.gov.kz/) | National geospatial data catalogue and official context layers | Search catalogue for Astana administrative boundaries, transport, land cover, hydrography, and facilities. Record metadata and licensing per layer. |
| 1 | [Kazakhstan Open Data Portal](https://data.egov.kz/) | Government facility registries and tabular indicators | Search by Astana/Akmola/legacy names (Astana, Nur-Sultan), owner, and dataset status; validate records and API/export access. |
| 2 | [State schools dataset](https://data.egov.kz/datasets/view?index=state_schools) | School locations and possibly enrollment/organization attributes | The listed fields include coordinates and learners, but verify that they cover Astana, are current, and have usable capacity data. Facility counts are not school-capacity adequacy. |
| 2 | [Astana public health / dispensary dataset](https://data.egov.kz/datasets/view?index=nur-sultan_kalasynyn_dispanser) and portal medical-organization search | Candidate clinic/dispenser locations and service details | Inspect actual fields and geocoding. Confirm coverage, update cadence, license, and whether facilities are primary-care clinics rather than specialized services. |
| 2 | [Astana parks dataset](https://data.egov.kz/datasets/view?index=parkter_turaly_akparat) | Park inventory lead for the `e1` map context | The catalogue reports the dataset as archived and last updated in 2020. Treat it as a lead only until the owner confirms it is still complete and reusable. |
| 2 | [Astana bus-stop dataset](https://data.egov.kz/datasets/view?index=bus_stops) and [real-time bus movement dataset](https://data.egov.kz/datasets/view?index=avtobustardyn_osy_uakyttagy_ko) | Transit stop/route research leads | The stop list is marked archived and was last updated in 2015; the real-time bus service is also listed as archived. Do not use either as current transit coverage without confirmation. Search for a current GTFS feed or official route/schedule API. |
| 2 | [Road injury-crash report](https://data.egov.kz/datasets/view?index=gp_od_service_dtp1) | Road-safety trend lead for `b2` | The published description indicates monthly statistical reports and a regional field. Determine whether a lawful, quality-checked district-level geography exists; regional totals cannot be allocated to districts. Avoid exposing personal or sensitive incident details. |
| 2 | [GHSL population and built-up grids](https://human-settlement.emergency.copernicus.eu/datasets.php) | Independent coarse context for settlement/population distribution | GHSL offers gridded population and built-up products at multiple resolutions/epochs and EU reuse terms with acknowledgment. It is a modeled global product, not current local census truth; use for comparison/context only, never to overwrite the synthetic `population_share`. |
| 2 | [WorldPop Kazakhstan population grids](https://hub.worldpop.org/doi/10.5258/SOTON/WP00122) | Alternative 100 m modeled population distribution for display and sensitivity checks | Values are modeled per-pixel population estimates tied to a reference year and method. Compare reference year and accuracy/methodology with GHSL and official district totals; do not replace dataset population shares or call the cells census counts. |
| 2 | [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | Terrain/elevation context, derived slope, broad drainage-flow screening | GLO-30 has global 30 m resolution, but current access categories/registration and license terms must be checked before extracting or redistributing. A 30 m DEM is not an urban storm-drain model; do not infer parcel/block flood risk without drainage, culvert, and validated hydrology data. |
| 1 | [Approved Astana General Plan to 2035 (Adilet)](https://adilet.zan.kz/rus/docs/P2400000033) and [city government summary](https://www.gov.kz/memleket/entities/astana-saulet/press/news/details/687546?lang=ru) | Official planned transport, housing, social, utility, recreation, and growth context; identifies 2030 as a first construction stage | This is a plan, not current infrastructure or a probability forecast. Separate adopted-plan features from existing features. Confirm latest legal revision, access to machine-readable maps, reuse rights, spatial scale, and whether digitized proposals can be georeferenced defensibly. |
| 2 | [Kazhydromet](https://www.kazhydromet.kz/) bulletins and data services | Local authority source for station observations, climate normals, precipitation, air quality, and official forecasts | Public bulletins are evidence of reporting but may not expose a reusable API or station-level bulk data. Ask about historical station data, forecast grids, units, timestamps, reuse, and license. Do not treat a monthly city report as district-level measurements. |
| 2 | [Open-Meteo Forecast API](https://open-meteo.com/en/docs), [Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), [Historical Forecast API](https://open-meteo.com/en/docs/historical-forecast-api), [Climate API](https://open-meteo.com/en/docs/climate-api) | Candidate for near-term precipitation/weather events, modeled recent/history series, and ensemble climate context | The standard forecast horizon is up to 16 days; reanalysis history is model-filled grid data at roughly 9–25 km; historical forecasts are archived model runs; climate projections are scenarios, not weather forecasts. Current docs describe free use for non-commercial cases and CC BY 4.0 data attribution, with separate commercial/self-hosted conditions. Verify current plan and terms before use. |
| 2 | [Google Maps Platform Weather API](https://developers.google.com/maps/documentation/weather) | Paid/keyed alternative for current conditions, precipitation, alerts, hourly/daily forecast | Official docs describe up to 240 hourly forecast hours, 10 daily days, and only 24 hours of history; billing and API credentials are required. Historical values are primarily modeled output, not a station archive. Candidate for a polished live weather card, not a long-term historical/climate source. |
| 2 | [Yandex Weather API](https://yandex.ru/dev/weather/doc/ru/concepts/api) and [pricing](https://yandex.com/dev/weather/doc/ru/concepts/pricing) | Keyed commercial candidate for current forecast and location weather | Access depends on a plan/key; published pricing page contains archived tariffs. Confirm active plan, Kazakhstan coverage, forecast range, cache/display terms, and whether any historical archive is actually included. Do not assume Yandex weather is free or open data. |
| 3 | [OpenAQ API](https://docs.openaq.org/) and local monitoring network owners | Air-quality station metadata and measurements that may contextualize `e2` | Verify active Astana station coverage, pollutants, quality flags, timestamp gaps, licensing, and actual observations. Forecast/model grids and station observations must remain distinct. A station is not a district-wide average. |
| 2 | [OpenStreetMap](https://www.openstreetmap.org/) | Roads, paths, mapped parks, stops, and POIs to render/contextualize | Coverage and tagging are community-maintained and uneven. OSM is ODbL: provide required attribution, follow database share-alike terms for derived databases, and do not assume the public tile service is a production tile API. Keep OSM-derived data separable and document the chosen extraction/license path. |
| 3 | Astana environment and utility operators / city agencies | AQI/PM station observations (`e2`), outage duration (`c1`), service-request resolution (`c2`), lighting/camera inventory (`b1`), traffic counts/speeds (`t1`) | Discovery required. Ask for aggregate machine-readable records, field definitions, coverage, update cadence, and reuse terms. Do not infer missing values from unrelated data. |

Candidate links are starting points, not confirmation that a dataset is current,
complete, accessible, or licensed for our intended use. Record the date each
source is checked; portal contents and policies can change.

## Audit result (2026-09-23)

The first research pass is recorded in [`docs/enrichment/`](docs/enrichment/README.md).
It did **not** establish reusable official geometry or a safe crosswalk for
the five synthetic districts: current official city material reports six
districts, including Sarayshyq, while the baseline has five profiles; the
current legal General Plan text was amended in August 2026. See
[`boundaries/README.md`](docs/enrichment/boundaries/README.md) for evidence
and the no-go decision. Do not draw a score map or attach context features to
the five old codes until boundary vintage or an approved new aggregation is
settled.

The audit found archived/stale eGov listings for parks and bus stops, no
verified current redistributable facility extracts, regional-only road-crash
statistics, and no fit-for-purpose public district outage/request data. The
Open-Meteo provider has one small, dated Astana city-reference precipitation
forecast snapshot accepted for **non-commercial context only**; it has no
district resolution and no scoring effect. Provider tradeoffs and the sample
are in [`weather/README.md`](docs/enrichment/weather/README.md); other source
decisions are in the urban-quality audit.

No district or urban-quality GeoJSON is bundled. Population/terrain sources
remain under evaluation; notes are in
[`population-terrain/research.md`](docs/enrichment/population-terrain/research.md).
These are evidence-based blockers, not permission to substitute OSM tags,
screenshots, or synthetic data as measured facts.

### Weather, precipitation, and time horizons

Keep four data classes separate in both storage and UI:

1. **Observed station data:** measured at the station, with station ID, timestamp,
   quality flags, units, and missingness.
2. **Weather forecast:** a model's prediction for a stated issue time and valid
   time. Short-range precipitation probability/amount can support an optional
   demo event or context panel.
3. **Reanalysis / historical modeled weather:** a retrospective model product
   blended with observations. It is useful for seasonality and scenario design,
   but is not equivalent to station truth.
4. **Climate projection / long-range scenario:** a range of possible future
   climate conditions. It can inform planning context, but cannot predict the
   actual weather on a future date or set a deterministic quarter-by-quarter
   score.

The existing simulator horizon is eight quarters. A 10–16 day weather forecast
cannot provide a forecast for that full horizon, and a climate projection to
2030 is not a substitute. If weather is added, use it as an explicitly optional
scenario/event context (for example, heavy precipitation or extreme cold),
with defined source/model, issue time, valid time, confidence/probability,
spatial support, and a fixed deterministic scenario snapshot. Weather must not
change any of the ten existing scores unless a future, separately versioned
model explicitly adds a reviewed causal method.

For map display, sample weather only at a documented city/district location or
retain the provider grid-cell footprint. Do not request a separate point for
every display cell and imply a 500 m weather resolution: these candidate
products have kilometer-scale/model-grid support. For a multi-district
comparison, cache one response per district representative point only if the
provider permits that use; otherwise use a bounding-box/grid download under
the provider's terms. Hide stale data, show last successful update and model
run time, and let the core simulator operate when a provider is unavailable.

Current source guidance indicates useful trade-offs to validate in the audit:
Open-Meteo provides forecasts to 16 days, long reanalysis histories and
historical forecast runs, with separate free/non-commercial and commercial
terms; Google's Weather API provides forecasts to 10 days and just 24 hours of
history and requires billing; Yandex requires a key and plan, and its public
pricing page includes archived tariffs. These are candidates for distinct use
cases, not interchangeable data sources.

## Work plan

### Phase 0 — Freeze and describe the baseline

1. Record the Git commit and cryptographic checksums for `datadoc.md` and
   `backend/data/astana-v1.json` before enrichment work.
2. Make a field inventory of all existing dataset keys, the ten indicators,
   their direction/units/definitions, district codes/shares, 14 initiative
   codes, all rule pairs, weights, budget, horizon, and scoring version.
3. Treat those two files as read-only during enrichment. Any baseline change
   must be an explicit, separately reviewed task.

**Output:** a baseline lock record and a preservation checklist. No data values
are changed in this phase.

### Phase 1 — Source and license audit

For each candidate dataset, create a source record containing:

- owner/publisher, dataset title, canonical download/API URL, access date, and
  dataset/update/version date;
- license or written reuse permission, required attribution, redistribution
  obligations, and any restrictions on derived databases or hosting;
- geographic coverage and smallest supported spatial unit;
- coordinate reference system, geometry type, key fields, units, and null
  conventions;
- observation/reference period, update cadence, collection method, and
  limitations stated by the publisher;
- extraction method, query parameters, source-file checksum, and any
  transformations applied.

Use the city and national geoportals first for boundary provenance. Use
OpenStreetMap for map/context candidates with an explicit ODbL handling plan.
Use GHSL as an independently modeled spatial context layer, not a local
official count. Audit government open-data records rather than assuming their
catalogue label means current: the parks and bus-stop examples above are marked
archived/stale in catalogue metadata.

**Output:** `sources.csv` (or equivalent) with each record marked `accepted`,
`context_only`, `needs_permission`, `stale`, or `rejected`, and a short reason.

### Phase 2 — Establish the boundary and crosswalk

1. Obtain the best documented city boundary and district polygons available
   from the official source. Retain the unmodified source files.
2. Confirm whether the official current district units correspond exactly to
   `esil`, `almaty`, `saryarka`, `baikonur`, and `nura`. Names alone are not a
   durable key; create an explicit crosswalk with source IDs, Russian/Kazakh
   names, synthetic code, match method, and confidence.
3. Check for split/merged/reorganized boundaries, gaps, overlaps, invalid
   geometry, and differences between the official city boundary and modeled
   extent. Do not silently force an uncertain match.
4. Choose and document a suitable projected metric CRS for spatial processing.
   Preserve the source CRS and transform outputs explicitly.
5. If district boundaries cannot be openly redistributed, record that decision
   and use a permitted geometry source or a hosted basemap with only allowed
   overlays. Do not copy a screenshot/vector from a portal without permission.

**Output:** versioned, source-attributed district geometry plus a reviewed
crosswalk, or a documented blocker. Existing synthetic district records stay
untouched.

### Phase 3 — Sample and quality-check candidate layers

Before integrating a source, inspect a small extract and test:

- it actually covers Astana and all five modeled districts;
- timestamps are sufficiently recent for the intended context and align with
  the declared reference period;
- coordinates parse correctly, plot in the expected places after CRS
  conversion, and have plausible positional accuracy;
- duplicates, nulls, stale organizations, and out-of-city features can be
  identified rather than silently counted;
- definitions are comparable across districts and not just record counts from
  uneven reporting;
- source totals and a hand-checked sample agree with source documentation;
- licensing permits the planned download, transformation, redistribution, and
  web display.

Set thresholds with the source owner/technical reviewer for each layer (for
example, minimum geocoded share or maximum age) before inspecting final
district-level results. Report coverage and missingness alongside all derived
counts. A layer that fails a threshold remains a research note, not a product
dataset.

**Output:** a concise quality report and accept/reject decision for each source.

### Phase 4 — Build a separate, additive enrichment package

Do not append third-party measurements to `astana-v1.json`. Create a companion
package, for example:

```text
backend/data/enrichment/astana-context-v1/
  manifest.json
  districts.geojson
  grid_500m.geojson          # optional display geometry, not an analysis unit by itself
  facilities.geojson        # only accepted, license-compatible point layers
  district_context.csv      # only documented aggregates, source keys retained
  sources.csv
  README.md
```

`manifest.json` should identify the source baseline version/hash without
modifying it, enrichment package version, extraction date, CRS, join key,
source-record IDs, license/attribution, transformation script/version,
reference periods, quality flags, and known limitations. Store original source
extracts in a separate archive/cache if their licenses allow redistribution;
otherwise store retrieval instructions and hashes only.

Use `district_code` as the join to the existing district code, but preserve the
original source identifier and source feature ID in every derived record.
Treat the 500 m grid as map presentation geometry. Never sum repeated district
indicators over grid cells or imply that synthetic district values are
measured at cell resolution.

### Phase 5 — Define safe derived context, not replacement scores

Initially publish descriptive overlays and optional district aggregates such
as mapped school/clinic/park counts, mapped stop counts, road-network length,
or GHSL population distribution. Each aggregate must state whether it is a
simple count, density, distance, modeled estimate, or official observation;
show its period and coverage; and remain separate from the simulator score.

Do not call a simple facility count “accessibility” or “capacity.” For example,
to test the `t2` definition, research stop locations **and** current route
geometry, service frequency by time period, and a defensible population
surface. A point-in-buffer count alone cannot establish that residents are
within 500 m of service every ten minutes. Likewise, `e1` needs measured/mapped
green area and a validated denominator; `e2` needs time-series sensor evidence;
`s1`/`s2` need capacity and demand rather than locations alone; and utility,
safety, and service-quality indicators require fit-for-purpose records.

If future evidence supports recalibrating an indicator, first make a separate
proposal with a reproducible method, uncertainty/missingness treatment,
independent validation, user-visible source/provenance, and an explicit new
dataset/scoring version. Do not mix such a proposal into the first map layer.

### Phase 6 — UI integration and release

- Display the five official/source-attributed district geometries; allow map
  clicks to choose the district for district-scoped initiatives.
- Show open context layers separately from the simulator’s synthetic baseline
  and scenario result. Label layer type, source, date, and coverage in the map
  legend or an info panel.
- Keep a district list/table as an accessible fallback and make the simulator
  usable if optional spatial assets fail to load.
- Identify synthetic baseline values as synthetic. Identify third-party
  contextual estimates as estimates. Do not present a mixed layer as a single
  validated “live” city score.
- Add required attribution in the map and dataset documentation; specifically
  follow [OpenStreetMap attribution and ODbL guidance](https://www.openstreetmap.org/copyright)
  for any OSM-derived content.
- Package only the clipped city-scale geometries needed by the client. Keep
  source data processing offline/reproducible; do not make live, high-latency
  requests to public catalogue or geocoding services from the browser.

**Output:** a reproducible map data package and UI that can toggle context
without altering baseline numbers or scoring.

### Phase 7 — Parallel implementation handoff

After Phase 0's baseline lock and Phase 1's initial license/source check, the
following bounded work packets can run in separate worktrees. Each agent owns
only its listed output paths and must not edit `datadoc.md`,
`backend/data/astana-v1.json`, the scoring service, or the shared enrichment
manifest. The integrator reviews source decisions and merges the common
contract after the research packets return.

| Work packet | Scope | Owned output | Must not do |
| --- | --- | --- | --- |
| A — boundaries and 2035 plan | Official city/district geometry, crosswalk to five synthetic district codes, current legal plan/revision, planning layers and reuse rights | `docs/enrichment/boundaries/` source audit, crosswalk proposal, sample/export instructions | Do not digitize a plan image as authoritative geometry or modify synthetic district codes/shares |
| B — weather and precipitation | Compare Kazhydromet, Open-Meteo, Google Weather, Yandex Weather, and any suitable open model for Astana coordinates; test forecast/history/climate distinction, terms, key requirements, grid resolution, cache rules, and latency | `docs/enrichment/weather/` comparison, sample response fixture with retrieval metadata, proposed provider-neutral adapter contract | Do not place API keys in frontend/Git, query every 500 m cell, use forecasts as observations, or feed weather into the QoL score |
| C — urban quality and facilities | Audit eGov/NSDI/OSM/Kazhydromet candidates for transit, schools, clinics, green areas, air quality, road safety, street lighting, utility reliability, and service requests | `docs/enrichment/urban-quality/` source cards, coverage/quality matrix, accepted layer samples | Do not convert simple POI counts into capacity/accessibility or change any indicator definition/value |
| D — population, built-up, and terrain | Compare GHSL/WorldPop and elevation/land cover sources, their dates/resolution/licensing, and safe district/grid aggregation | `docs/enrichment/population-terrain/` evaluation, tiny clipped sample, processing proposal | Do not replace `population_share`, represent modeled pixels as census facts, or infer engineering-grade flood risk from terrain alone |
| Integrator — shared contract and web wiring | Own the immutable baseline hash, common source-card schema, approved companion package, API/cache contract, attribution, and final integration/review | `backend/data/enrichment/` plus shared `docs/enrichment/README.md` only after packets pass review | Do not block the current simulator on third-party APIs; do not change baseline/scoring in this enrichment task |

#### Shared handoff contract

Each work packet returns a short report with:

- question and intended simulator/UI use;
- source owner, exact URL/product/version, accessed date, license/attribution,
  access/key/billing requirements, and redistribution decision;
- sample geography, CRS, spatial and temporal resolution, and reference period;
- sample response or clipped artifact plus its checksum and retrieval steps;
- field-to-use mapping, completeness/accuracy caveats, and rejected inferences;
- latency/rate limits/cache TTL or static snapshot recommendation;
- go/no-go recommendation, open questions for the data owner, and exact files
  touched.

Use an interface-neutral sidecar record shape so independent artifacts can be
reviewed before selecting PostGIS, GeoJSON, Parquet, raster tiles, or a live API:

```json
{
  "layer_id": "weather.precipitation.forecast",
  "source_id": "provider-product-version",
  "district_code": "nura",
  "value": 0.0,
  "unit": "mm",
  "semantic_status": "forecast",
  "reference_time": "ISO-8601 issue time",
  "valid_time": "ISO-8601 target time",
  "spatial_support": "provider grid cell or district representative point",
  "quality_status": "reviewed | provisional | stale | missing",
  "source_record_id": "provider station/grid/feature id"
}
```

`value` is a contextual value only; this contract does not add it to an
indicator or scoring input. Observed, forecast, reanalysis, projection, plan,
and map context layers use distinct `layer_id`/`semantic_status` values. Missing
data remains missing; do not impute a synthetic or zero value.

#### Parallel execution and merge order

1. Integrator publishes the read-only baseline hash and shared source-card
   template.
2. A–D research independently in worktrees and commit only within their owned
   `docs/enrichment/<workstream>/` paths. Small sample fixtures go in the same
   owned path and are license-cleared first.
3. Integrator reviews license, geography, temporal fit, accuracy, and UI value;
   rejects stale/non-redistributable sources or asks the owner for access.
4. Select only accepted layers, publish the companion schema, then produce
   versioned sidecar assets. Review the diff to confirm the two baseline files
   and scoring code are unchanged.
5. Implement map/UI wiring after source decisions, with no runtime vendor
   dependency on optional weather or catalogue services. Add caching only for
   accepted live sources and obey their current terms.
6. Any proposed indicator recalibration becomes a separate task and dataset
   version with its own methodology, tests, approval, and migration plan.

## Acceptance criteria

1. Checksums or equivalent comparison show `datadoc.md` and
   `backend/data/astana-v1.json` were not modified by the enrichment work.
2. All existing district codes, indicator codes/definitions/values, population
   shares, initiative IDs/effects/costs/lags/scopes, rules, weights, and scoring
   version remain unchanged.
3. Every displayed external layer has a provenance record, license decision,
   date/reference period, spatial resolution, attribution, and quality status.
4. Joins to the five districts are explicit and auditable; unmatched features
   and coverage gaps are reported.
5. Contextual observations and estimates are clearly distinguishable from
   synthetic simulator indicators, and they do not feed into score calculation.
6. OSM-derived content meets ODbL requirements; no public tile/API service is
   treated as an unrestricted production endpoint.
7. The map remains useful with optional enrichment layers disabled and the
   existing model remains reproducible from its current dataset alone.
8. Weather panels distinguish observation, forecast, reanalysis, and climate
   projection; show issue/valid/reference times and never imply sub-grid
   precision or long-range deterministic weather.
9. Parallel agents can deliver independently without editing shared baseline
   files or colliding on generated output paths.

## Suggested order of work

1. Audit the official city portal and NSDI catalogue for reusable boundaries.
2. Confirm crosswalk and boundary match against all five dataset codes.
3. Audit eGov facility datasets (schools, clinics, parks) for real freshness,
   coordinates, and license; park and bus-stop catalogue entries are flagged
   stale/archived and need owner confirmation.
4. Use OSM for roads/POIs only after agreeing how its data will be extracted,
   attributed, and kept license-compliant.
5. Add GHSL as clearly modeled population/built-up context if it improves the
   map; compare it with district totals without changing `population_share`.
6. Research sources for the ten indicators individually. Promote no proxy to
   a score input without evidence, methodology, and a new versioned dataset.
7. Run work packets A–D after the baseline/source-card templates are ready.
8. Build the independent enrichment package and map UI after the source audit
   has accepted specific layers.
