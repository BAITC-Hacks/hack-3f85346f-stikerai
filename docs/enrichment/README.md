# Enrichment package integration guide

This directory holds provenance/research reports for optional, separately
versioned Astana context layers. It is additive to the simulator dataset.

## Current audit result

- [`BASELINE_LOCK.md`](BASELINE_LOCK.md) records the baseline hashes.
- A dated city-reference Open-Meteo forecast snapshot is accepted for
  non-commercial contextual demonstration, with attribution and expiry caveat.
- A dated OpenStreetMap/Overpass snapshot of 171 Astana-area features tagged
  `amenity=school` is accepted for map-only site reconnaissance, with ODbL
  attribution. These are community-mapped points, not an official school
  register or complete pilot-ready dataset.
- Official district boundaries are **blocked**: current Astana has six
  districts versus the simulator's five synthetic profiles; no reusable
  geometry and vintage-matched crosswalk were verified.
- Facility, air-quality, transit, road-safety, utility, and service layers
  remain research-only where current spatial extracts and reuse terms were
  not established.
- Population/terrain and 2035 plan layers remain conditional on reference
  year, geometry, access, and license review.

Therefore, no score map or joined facility layer is released yet. Read each
workstream report for source-level evidence and handoff requirements.

## Non-negotiable baseline boundary

The current records in `datadoc.md` and `backend/data/astana-v1.json` remain
unchanged. No layer in this package may alter the five district codes or
population shares, ten indicator definitions/values/weights, 14 initiative
definitions/effects/rules, budget, horizon, or `astana-qol-v1` scoring behavior.
Any proposal to calibrate an indicator is a separate reviewed dataset version.

Context layers may appear on the map and in explanatory panels, but they are
not inputs to the existing score. Show source, reference time/period, spatial
support, semantic class, quality/missing status, and attribution.

## Workstream reports

- `population-terrain/research.md` — GHSL/WorldPop, elevation, and General Plan
  source audit and no-go/conditional-go guidance.
- `boundaries/` — official boundary provenance, district crosswalk, and
  General Plan spatial availability.
- `weather/` — meteo provider comparison, archive/forecast distinction, and
  optional weather snapshot adapter.
- `urban-quality/` — transport, facility, green-space, air-quality, safety,
  utility, and service data source audit.
- `../../Data_Enrichment_Research_Plan.md` — staged research plan, parallel
  workstream boundaries, and acceptance criteria.

The last three paths are owned by isolated agent work packets. Keep each
workstream's report and allowed sample fixtures under its own path.

## Shared source card

Every dataset or API layer needs a source card containing:

- `source_id`, publisher/owner, exact product/dataset name, canonical URL;
- `accessed_at`, source `updated_at` or model/release version, reference period;
- license/permission, display and redistribution terms, required attribution;
- endpoint, query parameters, API-key requirement (never the key itself),
  quotas/rate limits, permitted cache behavior, and expected refresh cadence;
- geometry/value type, units, CRS, spatial/temporal support, and null/nodata
  meaning;
- sample checksum/retrieval method, transformations and script version;
- `semantic_status`: `observed`, `forecast`, `reanalysis`, `projection`,
  `planned`, `modeled`, or `context`;
- quality status, completeness/coverage, limitations, and go/no-go decision.

Do not put credentials in Git, the frontend bundle, reports, fixtures, or
command output. Live vendor requests must be made server-side if they are ever
enabled. Optional layers must not delay or block the core simulator.

## Sidecar record contract

Until source audits finish, this is the neutral record shape for a contextual
value; spatial features may additionally carry GeoJSON geometry:

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

This shape is contextual and does not extend the score schema. Observations,
forecasts, modeled/reanalysis values, projections, and planned works must not be
merged into one unlabeled series. Missing is never silently represented as
zero or copied from a synthetic score.

## Integration gates

1. Each owner finishes and records their source/licensing/quality audit.
2. A geometry owner confirms the official source, district-code crosswalk,
   CRS, city extent, and export rights before points/rasters are clipped or
   joined. No name-only fuzzy join to districts.
3. The integrator accepts only sources that meet the stated coverage,
   freshness, semantic, and redistribution/display requirements.
4. Accepted source files go into a companion `backend/data/enrichment/`
   release with a manifest; non-redistributable sources are represented only
   by provenance, hash, and retrieval instructions.
5. Before merge, compare the baseline files against the recorded hashes and
   inspect code changes to confirm the scoring service did not start consuming
   these layers.
6. UI displays baseline/scenario scores separately from context, with a
   district-list fallback and visible synthetic-data notice.

## Provenance manifest minimum

The release manifest must include an enrichment version, source baseline
version and hash, source-card IDs, build timestamp, CRS, spatial extent, join
keys, transformation versions, license/attribution, data/reference dates,
quality flags, missingness/coverage, and known limitations. Store checksums for
all included assets. Never overwrite an earlier release in place.
